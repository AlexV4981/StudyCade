"""Optional private Supabase gateway. No admin key or browser-readable tokens."""

import asyncio
import base64
from collections import OrderedDict
from dataclasses import dataclass
import hashlib
import json
import os
import re
import secrets
import time
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, Response, RedirectResponse

from .cloud_state import validate_workspace

COOKIE = "__Host-studycade-cloud"
LOGIN_COOKIE = "__Host-studycade-login"
LOGIN_AGE = 600
CALLBACK = "/api/cloud/auth/callback"
SESSION_AGE = 30 * 86400
AUTH_PATHS = {
    "/api/cloud/auth/start": "POST",
    "/api/cloud/auth/logout": "POST",
}
MUTATIONS = {**AUTH_PATHS, "/api/cloud/workspace": "PUT"}
EMAIL = re.compile(r"[^\s@<>\x00-\x1f]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\Z")


def email_address(value):
    if not isinstance(value, str) or len(value) > 254:
        raise HTTPException(400, "Enter a valid email address.")
    value = value.strip().lower()
    if not EMAIL.fullmatch(value):
        raise HTTPException(400, "Enter a valid email address.")
    return value


def address_hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


@dataclass(frozen=True)
class CloudConfig:
    url: str
    publishable_key: str
    session_key: str
    allowed_hashes: frozenset

    @classmethod
    def from_env(cls, origin):
        values = [os.getenv(k, "") for k in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "CLOUD_SESSION_KEY", "CLOUD_ALLOWED_EMAIL_HASHES")]
        if not any(values):
            return None
        if not all(values) or not origin.startswith("https://"):
            raise ValueError("Cloud saving requires its complete private configuration and an HTTPS public origin.")
        url, key, session_key, hashes = values
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not re.fullmatch(r"[a-z0-9]{20}\.supabase\.co", parsed.netloc) or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
            raise ValueError("Use the exact official HTTPS Supabase project origin.")
        if key.startswith("sb_publishable_"):
            if not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]{10,200}", key):
                raise ValueError("Invalid Supabase publishable key.")
        else:
            try:
                payload = key.split(".")[1]
                claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
                if claims.get("role") != "anon" or len(key) > 2048:
                    raise ValueError()
            except (ValueError, IndexError, KeyError):
                raise ValueError("Cloud saving accepts only a publishable or legacy anon key, never an administrator key.") from None
        try:
            Fernet(session_key.encode())
            approved = hashes.split(",")
            if not 1 <= len(approved) <= 5 or any(not re.fullmatch(r"[0-9a-f]{64}", h) for h in approved):
                raise ValueError()
        except (ValueError, HTTPException):
            raise ValueError("Invalid private cloud session key or approved sign-in list.") from None
        return cls(url.rstrip("/"), key, session_key, frozenset(approved))


class CloudGateway:
    def __init__(self, config, origin, transport=None):
        self.config = config
        self.callback_url = origin + CALLBACK
        self.cipher = Fernet(config.session_key.encode())
        self.client = httpx.AsyncClient(base_url=config.url, timeout=httpx.Timeout(12, connect=5), limits=httpx.Limits(max_connections=8, max_keepalive_connections=4), follow_redirects=False, trust_env=False, transport=transport)
        self.refresh_lock = asyncio.Lock()
        self.refresh_cache = OrderedDict()
        self.revoked = OrderedDict()
        self.limits = OrderedDict()
        self.salt = secrets.token_bytes(32)

    async def close(self):
        await self.client.aclose()

    def limit(self, bucket, value, maximum, seconds):
        now = time.monotonic()
        key = (bucket, hashlib.sha256(self.salt + value.encode()).digest())
        start, count = self.limits.get(key, (now, 0))
        if now - start >= seconds:
            start, count = now, 0
        if count >= maximum:
            raise HTTPException(429, "Too many requests. Wait a few minutes and retry.")
        self.limits[key] = (start, count + 1)
        self.limits.move_to_end(key)
        while len(self.limits) > 2048:
            self.limits.popitem(last=False)

    async def upstream(self, method, path, *, access=None, body=None, params=None, maximum=21_000_000):
        headers = {"apikey": self.config.publishable_key, "Accept": "application/json"}
        if access:
            headers["Authorization"] = "Bearer " + access
        try:
            async with self.client.stream(method, path, headers=headers, json=body, params=params) as response:
                raw = bytearray()
                async for chunk in response.aiter_bytes():
                    if len(raw) + len(chunk) > maximum:
                        raise HTTPException(502, "Cloud service returned an oversized response.")
                    raw.extend(chunk)
                try:
                    data = json.loads(raw) if raw else None
                except (ValueError, UnicodeDecodeError):
                    raise HTTPException(503, "Cloud service is unavailable. Your existing work is unchanged.")
                return response.status_code, data
        except (httpx.HTTPError, TimeoutError):
            raise HTTPException(503, "Cloud service is unavailable. Your existing work is unchanged.") from None

    @staticmethod
    def checked(status):
        if status in (401, 403):
            raise HTTPException(401, "Sign in again to access your private cloud workspace.")
        if status == 409:
            raise HTTPException(409, "Workspace changed on another device. Reload the cloud workspace before saving again.")
        if status == 429:
            raise HTTPException(429, "Cloud request limit reached. Wait and retry.")
        if status == 507:
            raise HTTPException(507, "The free cloud storage limit was reached. Export a backup and remove unused material.")
        if not 200 <= status < 300:
            raise HTTPException(503, "Cloud service is unavailable. Your existing work is unchanged.")

    def decode(self, request):
        token = request.cookies.get(COOKIE, "")
        try:
            if not token or len(token) > 3800:
                raise ValueError()
            session = json.loads(self.cipher.decrypt(token.encode(), ttl=SESSION_AGE))
            if (
                str(UUID(session["user_id"])) != session["user_id"]
                or str(UUID(session["session_id"])) != session["session_id"]
                or not isinstance(session["access_token"], str)
                or not 0 < len(session["access_token"]) <= 2200
                or not isinstance(session["refresh_token"], str)
                or not 0 < len(session["refresh_token"]) <= 300
                or session["email_hash"] not in self.config.allowed_hashes
                or type(session["created_at"]) is not int
                or not 0 <= time.time() - session["created_at"] <= SESSION_AGE
                or type(session["expires_at"]) is not int
                or session["session_id"] in self.revoked
            ):
                raise ValueError()
            return session
        except (InvalidToken, ValueError, KeyError, TypeError, UnicodeError):
            raise HTTPException(401, "Sign in again to access your private cloud workspace.") from None

    def preflight(self, request):
        session = self.decode(request)
        if request.headers.get("X-StudyCade-Account") != session["user_id"]:
            raise HTTPException(409, "Your account changed. Reload before accessing or saving cloud material.")
        return session

    def make_session(self, data, previous=None):
        try:
            user = data["user"]
            uid = str(UUID(user["id"]))
            hashed = address_hash(email_address(user["email"]))
            if hashed not in self.config.allowed_hashes or not user.get("email_confirmed_at") or user.get("is_anonymous", False):
                raise ValueError()
            access, refresh = data["access_token"], data["refresh_token"]
            payload = access.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            sid = str(UUID(claims["session_id"]))
            if claims.get("sub") != uid or claims.get("role") != "authenticated":
                raise ValueError()
            duration = data["expires_in"]
            if type(duration) is not int or not 60 <= duration <= 86400 or not isinstance(refresh, str) or not 0 < len(refresh) <= 300:
                raise ValueError()
            if not isinstance(access, str) or len(access) > 2200:
                raise ValueError()
            if previous and (uid != previous["user_id"] or sid != previous["session_id"] or hashed != previous["email_hash"]):
                raise ValueError()
            return {"user_id": uid, "session_id": sid, "email_hash": hashed, "access_token": access, "refresh_token": refresh, "created_at": previous["created_at"] if previous else int(time.time()), "expires_at": int(time.time()) + duration}
        except (ValueError, KeyError, TypeError, IndexError, HTTPException):
            raise HTTPException(401, "Sign-in could not be verified. Request a new sign-in link and open it in the browser that requested it.") from None

    @staticmethod
    def identity(session):
        return {"id": session["user_id"], "email": session["user_id"] + "@studycade.local", "role": "cloud", "displayName": "Cloud workspace"}

    def put_cookie(self, response, session):
        token = self.cipher.encrypt(json.dumps(session, separators=(",", ":")).encode()).decode()
        if len(token) > 3700:
            raise HTTPException(503, "Cloud sign-in response exceeds secure browser session limits.")
        remaining = max(0, SESSION_AGE - (int(time.time()) - session["created_at"]))
        response.set_cookie(COOKIE, token, max_age=remaining, secure=True, httponly=True, samesite="strict", path="/")

    @staticmethod
    def clear_cookie(response):
        response.delete_cookie(COOKIE, secure=True, httponly=True, samesite="strict", path="/")

    async def session(self, request):
        session = self.decode(request)
        if session["expires_at"] > time.time() + 60:
            return session, False
        async with self.refresh_lock:
            if session["session_id"] in self.revoked:
                raise HTTPException(401, "Sign in again to access your private cloud workspace.")
            key = hashlib.sha256(session["refresh_token"].encode()).digest()
            cached = self.refresh_cache.get(key)
            if cached and time.monotonic() - cached[0] < 10:
                return dict(cached[1]), True
            status, data = await self.upstream("POST", "/auth/v1/token", params={"grant_type": "refresh_token"}, body={"refresh_token": session["refresh_token"]}, maximum=65536)
            if status in (400, 401, 403):
                raise HTTPException(401, "Your cloud session expired. Sign in again; saved cloud work is unchanged.")
            self.checked(status)
            refreshed = self.make_session(data, session)
            self.refresh_cache[key] = (time.monotonic(), refreshed)
            while len(self.refresh_cache) > 64:
                self.refresh_cache.popitem(last=False)
            return refreshed, True

    async def dispatch(self, request: Request):
        try:
            return await self.handle(request)
        except (ValueError, TypeError, KeyError, UnicodeError, OverflowError):
            return JSONResponse({"error": "Invalid cloud request or workspace data."}, status_code=400)
        except HTTPException as exc:
            response = JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)
            if exc.status_code == 401:
                self.clear_cookie(response)
            return response

    async def handle(self, request):
        path, method = request.url.path, request.method
        peer = request.client.host if request.client else "unknown"
        if path == CALLBACK and method == "GET":
            self.limit("callback-peer", peer, 20, 300)
            response = RedirectResponse("/", status_code=303)
            response.delete_cookie(LOGIN_COOKIE, secure=True, httponly=True, samesite="lax", path="/")
            try:
                if list(request.query_params.keys()) != ["code"] or len(request.query_params.getlist("code")) != 1:
                    raise ValueError()
                code = str(UUID(request.query_params["code"]))
                token = request.cookies.get(LOGIN_COOKIE, "")
                if not token or len(token) > 1024:
                    raise ValueError()
                pending = json.loads(self.cipher.decrypt(token.encode(), ttl=LOGIN_AGE))
                verifier = pending["verifier"]
                if pending["email_hash"] not in self.config.allowed_hashes or not re.fullmatch(r"[A-Za-z0-9_-]{86}", verifier):
                    raise ValueError()
                status, data = await self.upstream("POST", "/auth/v1/token", params={"grant_type": "pkce"}, body={"auth_code": code, "code_verifier": verifier}, maximum=65536)
                self.checked(status)
                session = self.make_session(data)
                if session["email_hash"] != pending["email_hash"]:
                    raise ValueError()
                self.put_cookie(response, session)
            except (InvalidToken, ValueError, TypeError, KeyError, HTTPException):
                # A fixed fragment avoids reflecting provider errors or retaining the code in our URL.
                response.headers["location"] = "/#cloud-sign-in-failed"
            return response
        if request.url.query:
            raise HTTPException(400, "Cloud endpoints do not accept query parameters.")
        if path in AUTH_PATHS and method != AUTH_PATHS[path]:
            raise HTTPException(404, "Not found.")
        if path == "/api/cloud/auth/start":
            self.limit("start-global", "all", 10, 3600)
            self.limit("start-peer", peer, 5, 600)
            body = await request.json()
            email = email_address(body.get("email")) if isinstance(body, dict) and set(body) == {"email"} else email_address(None)
            self.limit("start-address", email, 2, 3600)
            verifier = secrets.token_urlsafe(64)
            hashed = address_hash(email)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
            if hashed in self.config.allowed_hashes:
                status, _ = await self.upstream("POST", "/auth/v1/otp", params={"redirect_to": self.callback_url}, body={"email": email, "create_user": True, "code_challenge_method": "s256", "code_challenge": challenge}, maximum=65536)
                if status >= 500:
                    raise HTTPException(503, "Sign-in service is unavailable. Retry later.")
                # Deliberately do not expose account existence, delivery or provider errors.
            response = JSONResponse({"message": "If this address has access, a sign-in link has been sent. Open the newest link in this same browser within 10 minutes. Email delivery limits apply."})
            pending = self.cipher.encrypt(json.dumps({"verifier": verifier, "email_hash": hashed}, separators=(",", ":")).encode()).decode()
            response.set_cookie(LOGIN_COOKIE, pending, max_age=LOGIN_AGE, secure=True, httponly=True, samesite="lax", path="/")
            return response
        if path == "/api/cloud/auth/logout":
            session = None
            confirmed = True
            try:
                if request.cookies.get(COOKIE):
                    session = self.decode(request)
                    active, _ = await self.session(request)
                    status, _ = await self.upstream("POST", "/auth/v1/logout", access=active["access_token"], params={"scope": "local"}, maximum=65536)
                    confirmed = status in (200, 204, 401, 403)
            except HTTPException:
                confirmed = False
            async with self.refresh_lock:
                if session:
                    self.revoked[session["session_id"]] = time.monotonic()
                    while len(self.revoked) > 2048:
                        self.revoked.popitem(last=False)
                self.refresh_cache.clear()
            # Always clear this device on an explicit sign-out, even during provider outages.
            response = JSONResponse({"signedOut": True, "revocationConfirmed": confirmed})
            self.clear_cookie(response)
            response.delete_cookie(LOGIN_COOKIE, secure=True, httponly=True, samesite="lax", path="/")
            return response
        if path == "/api/cloud/session" and method == "GET":
            if not request.cookies.get(COOKIE):
                return JSONResponse({"user": None})
            session, refreshed = await self.session(request)
            status, user = await self.upstream("GET", "/auth/v1/user", access=session["access_token"], maximum=65536)
            self.checked(status)
            if not isinstance(user, dict) or user.get("id") != session["user_id"] or address_hash(email_address(user.get("email"))) not in self.config.allowed_hashes or not user.get("email_confirmed_at") or user.get("is_anonymous", False):
                raise HTTPException(401, "Sign in again to access your private cloud workspace.")
            response = JSONResponse({"user": self.identity(session)})
        elif path == "/api/cloud/workspace" and method in ("GET", "PUT"):
            self.preflight(request)
            session, refreshed = await self.session(request)
            self.limit("workspace-peer", peer, 120, 60)
            self.limit("workspace-user", session["user_id"], 120, 60)
            params = {"owner_id": "eq." + session["user_id"], "select": "state,version", "limit": "1"}
            etag = request.headers.get("If-None-Match", "")
            if method == "GET":
                if re.fullmatch('"' + re.escape(session["user_id"]) + r':[0-9]{1,16}"', etag):
                    status, rows = await self.upstream("GET", "/rest/v1/studycade_workspaces", access=session["access_token"], params={**params, "select": "version"}, maximum=65536)
                    self.checked(status)
                    if not isinstance(rows, list) or len(rows) > 1:
                        raise HTTPException(503, "Cloud workspace could not be read.")
                    version = rows[0]["version"] if rows else 0
                    if etag == f'"{session["user_id"]}:{version}"':
                        response = Response(status_code=304, headers={"ETag": etag})
                        if refreshed:
                            self.put_cookie(response, session)
                        return response
                status, rows = await self.upstream("GET", "/rest/v1/studycade_workspaces", access=session["access_token"], params=params)
                self.checked(status)
                if not isinstance(rows, list) or len(rows) > 1:
                    raise HTTPException(503, "Cloud workspace could not be read.")
                state, version = (validate_workspace(rows[0]["state"]), rows[0]["version"]) if rows else (None, 0)
                response = JSONResponse({"state": state, "version": version}, headers={"ETag": f'"{session["user_id"]}:{version}"'})
            else:
                body = await request.json()
                if not isinstance(body, dict) or set(body) != {"state", "version"} or type(body["version"]) is not int or not 0 <= body["version"] < 2**53 - 1:
                    raise HTTPException(400, "Provide a valid workspace and revision.")
                state = validate_workspace(body["state"])
                status, value = await self.upstream("POST", "/rest/v1/rpc/studycade_save_workspace", access=session["access_token"], body={"expected_version": body["version"], "workspace": state}, maximum=65536)
                self.checked(status)
                version = value.get("version") if isinstance(value, dict) else value
                if type(version) is not int or version != body["version"] + 1:
                    raise HTTPException(503, "Cloud save could not be confirmed. Reload before retrying.")
                response = JSONResponse({"version": version}, headers={"ETag": f'"{session["user_id"]}:{version}"'})
        else:
            raise HTTPException(404, "Not found.")
        if refreshed:
            self.put_cookie(response, session)
        return response

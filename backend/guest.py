"""Public guest deployment: static UI + stateless text preview, no account database.

The guest frontend keeps its workspace in IndexedDB. No private server routes are
mounted here, and no supplied text is logged or written to disk.
"""

import asyncio
from collections import OrderedDict
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import secrets
import time
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

import anyio
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .content import preview_document
from .headers import security_headers

ROOT = Path(__file__).resolve().parents[1]
MAX_REQUEST = 5_000_000


def create_guest_app(dist_dir=None):
    configured = os.getenv("PUBLIC_ORIGIN") or os.getenv("RENDER_EXTERNAL_URL", "")
    parsed = urlsplit(configured)
    if configured and (
        parsed.scheme != "https" or not parsed.hostname or parsed.username
        or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment
    ):
        raise ValueError("Public guest origin must be an HTTPS origin.")
    origin = configured.rstrip("/")
    from .cloud import CloudConfig, CloudGateway, MUTATIONS
    cloud_config = CloudConfig.from_env(origin)
    cloud = CloudGateway(cloud_config, origin) if cloud_config else None

    @asynccontextmanager
    async def lifespan(app):
        yield
        if cloud:
            await cloud.close()
    dist = Path(dist_dir) if dist_dir else ROOT / "frontend/dist"
    salt = secrets.token_bytes(32)
    rates = OrderedDict()
    global_rates = {}
    parse_slots = anyio.CapacityLimiter(2)
    app = FastAPI(title="StudyCade", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.cloud = cloud

    class PreviewAdmission:
        """Bound entire in-flight previews, including request and response bodies."""
        def __init__(self, app):
            self.app = app
            self.slots = anyio.CapacityLimiter(2)

        async def __call__(self, scope, receive, send):
            preview = scope.get("path") == "/api/import/preview" and scope.get("method") == "POST"
            cloud_operation = cloud and (MUTATIONS.get(scope.get("path")) == scope.get("method") or (scope.get("path") in ("/api/cloud/workspace", "/api/cloud/auth/callback") and scope.get("method") == "GET"))
            if scope["type"] != "http" or not (preview or cloud_operation):
                return await self.app(scope, receive, send)
            try:
                self.slots.acquire_nowait()
            except anyio.WouldBlock:
                response = JSONResponse({"error": "Study service is busy. Retry shortly."}, status_code=429, headers=security_headers(bool(origin)))
                return await response(scope, receive, send)
            try:
                await self.app(scope, receive, send)
            finally:
                self.slots.release()

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exc):
        return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def unexpected(request, exc):
        return JSONResponse({"error": "The request could not be processed."}, status_code=500)

    @app.middleware("http")
    async def guard(request: Request, call_next):
        try:
            host = request.url.hostname or ""
            if origin:
                valid_host = host == parsed.hostname or host in ("127.0.0.1", "localhost", "::1")
            else:
                try:
                    valid_host = host == "localhost" or ipaddress.ip_address(host).is_loopback
                except ValueError:
                    valid_host = False
            if not valid_host:
                raise HTTPException(400, "Invalid host.")
            if request.method not in ("GET", "HEAD"):
                is_preview = request.url.path == "/api/import/preview" and request.method == "POST"
                is_cloud = cloud and MUTATIONS.get(request.url.path) == request.method
                if not (is_preview or is_cloud):
                    raise HTTPException(404, "Not found.")
                expected = origin or str(request.base_url).rstrip("/")
                if request.headers.get("origin") != expected:
                    raise HTTPException(403, "Request origin is not allowed.")
                if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
                    raise HTTPException(415, "Send JSON.")
                if is_cloud and request.url.path == "/api/cloud/workspace":
                    cloud.preflight(request)
                clock = time.monotonic()
                bucket = "preview" if is_preview else "cloud"
                global_window, global_count = global_rates.get(bucket, (clock, 0))
                if clock - global_window >= 60:
                    global_window, global_count = clock, 0
                peer = request.client.host if request.client else "unknown"
                key = (bucket, hashlib.sha256(salt + peer.encode()).digest())
                start, count = rates.get(key, (clock, 0))
                if clock - start >= 60:
                    start, count = clock, 0
                maximum = 20 if is_preview else 120
                if count >= maximum or global_count >= (60 if is_preview else 240):
                    raise HTTPException(429, "Request limit reached. Wait a minute and retry.")
                rates[key] = (start, count + 1)
                rates.move_to_end(key)
                while len(rates) > 1024:
                    rates.popitem(last=False)
                global_rates[bucket] = (global_window, global_count + 1)
                length = request.headers.get("content-length")
                request_limit = MAX_REQUEST if is_preview else 20_100_000 if request.url.path == "/api/cloud/workspace" else 8192
                if length and (not length.isdigit() or int(length) > request_limit):
                    raise HTTPException(413, "Request is too large.")
                raw = bytearray()
                try:
                    async with asyncio.timeout(10):
                        async for chunk in request.stream():
                            if len(raw) + len(chunk) > request_limit:
                                raise HTTPException(413, "Request is too large.")
                            raw.extend(chunk)
                except TimeoutError:
                    raise HTTPException(408, "Request timed out.")
                request._body = bytes(raw)
            response = await call_next(request)
        except HTTPException as exc:
            response = JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)
        response.headers.update(security_headers(bool(origin) or request.url.scheme == "https"))
        if request.url.path.startswith("/api/cloud/"):
            response.headers["Vary"] = "Cookie, X-StudyCade-Account, If-None-Match"
            if response.status_code == 401 and cloud:
                cloud.clear_cookie(response)
        return response

    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    @app.get("/api/deployment")
    async def deployment():
        return {"mode": "guest", "storage": "browser", "accounts": bool(cloud), "cloudAvailable": bool(cloud)}

    if cloud:
        @app.api_route("/api/cloud/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
        async def cloud_endpoint(path: str, request: Request):
            return await cloud.dispatch(request)

    @app.post("/api/import/preview")
    async def preview(request: Request):
        try:
            data = await request.json()
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(400, "Send a JSON object.")
        if not isinstance(data, dict):
            raise HTTPException(400, "Send a JSON object.")
        name, content, subject = data.get("name"), data.get("content"), data.get("subject")
        if not isinstance(content, str) or len(content.encode()) > 2_000_000:
            raise HTTPException(400, "Provide readable text under 2 MB.")
        if subject is not None and not isinstance(subject, str):
            raise HTTPException(400, "Choose a supported subject.")
        try:
            return await anyio.to_thread.run_sync(lambda: preview_document(name, content, subject), limiter=parse_slots)
        except (ValueError, TypeError):
            raise HTTPException(400, "Invalid study material. Check the filename, text size, format and subject.")

    @app.get("/robots.txt", response_class=PlainTextResponse)
    async def robots():
        return "User-agent: *\nDisallow: /\n"

    @app.get("/{path:path}")
    async def frontend(path: str):
        parts = Path(path).parts
        if any(p.startswith(".") for p in parts) or (parts and parts[0] == "api"):
            raise HTTPException(404, "Not found.")
        if path in ("", "index.html"):
            candidate = dist / "index.html"
        elif parts and parts[0] in ("assets", "fonts", "subjects", "mathlive"):
            candidate = dist / path
        else:
            raise HTTPException(404, "Not found.")
        candidate = candidate.resolve()
        if not candidate.is_relative_to(dist.resolve()) or not candidate.is_file() or candidate.suffix.lower() not in {".html", ".js", ".css", ".json", ".txt", ".svg", ".png", ".ico", ".ttf", ".woff", ".woff2"}:
            raise HTTPException(404, "Not found.")
        return FileResponse(candidate)

    app.add_middleware(PreviewAdmission)
    return app

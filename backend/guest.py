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
    dist = Path(dist_dir) if dist_dir else ROOT / "frontend/dist"
    salt = secrets.token_bytes(32)
    rates = OrderedDict()
    global_window, global_count = time.monotonic(), 0
    parse_slots = anyio.CapacityLimiter(2)
    app = FastAPI(title="StudyCade Guest", docs_url=None, redoc_url=None, openapi_url=None)

    class PreviewAdmission:
        """Bound entire in-flight previews, including request and response bodies."""
        def __init__(self, app):
            self.app = app
            self.slots = anyio.CapacityLimiter(2)

        async def __call__(self, scope, receive, send):
            if scope["type"] != "http" or scope.get("path") != "/api/import/preview" or scope.get("method") != "POST":
                return await self.app(scope, receive, send)
            try:
                self.slots.acquire_nowait()
            except anyio.WouldBlock:
                response = JSONResponse({"error": "Preview service is busy. Retry shortly."}, status_code=429, headers=security_headers(bool(origin)))
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
        nonlocal global_window, global_count
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
                if request.url.path != "/api/import/preview" or request.method != "POST":
                    raise HTTPException(404, "Not found.")
                expected = origin or str(request.base_url).rstrip("/")
                if request.headers.get("origin") != expected:
                    raise HTTPException(403, "Request origin is not allowed.")
                if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
                    raise HTTPException(415, "Send JSON.")
                clock = time.monotonic()
                if clock - global_window >= 60:
                    global_window, global_count = clock, 0
                peer = request.client.host if request.client else "unknown"
                key = hashlib.sha256(salt + peer.encode()).digest()
                start, count = rates.get(key, (clock, 0))
                if clock - start >= 60:
                    start, count = clock, 0
                if count >= 20 or global_count >= 60:
                    raise HTTPException(429, "Preview limit reached. Wait a minute and retry.")
                rates[key] = (start, count + 1)
                rates.move_to_end(key)
                while len(rates) > 1024:
                    rates.popitem(last=False)
                global_count += 1
                length = request.headers.get("content-length")
                if length and (not length.isdigit() or int(length) > MAX_REQUEST):
                    raise HTTPException(413, "Request is too large.")
                raw = bytearray()
                try:
                    async with asyncio.timeout(10):
                        async for chunk in request.stream():
                            if len(raw) + len(chunk) > MAX_REQUEST:
                                raise HTTPException(413, "Request is too large.")
                            raw.extend(chunk)
                except TimeoutError:
                    raise HTTPException(408, "Request timed out.")
                request._body = bytes(raw)
            response = await call_next(request)
        except HTTPException as exc:
            response = JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)
        response.headers.update(security_headers(bool(origin) or request.url.scheme == "https"))
        return response

    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    @app.get("/api/deployment")
    async def deployment():
        return {"mode": "guest", "storage": "browser", "accounts": False}

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

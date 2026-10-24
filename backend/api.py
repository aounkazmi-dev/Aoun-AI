"""HTTP transport. SSE events: sources, token, done, error. No client secrets."""

import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from backend import demo, rag
from backend.config import ROOT, settings

log = logging.getLogger("aoun.api")


class Turn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1500)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=500)
    history: list[Turn] = Field(default_factory=list, max_length=6)


def event(name: str, data: dict) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def advance(iterator):
    # StopIteration must not propagate through an asyncio Future.
    try:
        return next(iterator), False
    except StopIteration:
        return None, True


class BodyLimit:
    """Bound request bytes before JSON parsing, including chunked transfer bodies."""

    def __init__(self, app, limit=32768):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.limit:
                response = JSONResponse({"detail": "Request too large"}, status_code=413)
                return await response(scope, receive, send)
            if not message.get("more_body", False):
                break
        consumed = False

        async def replay():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


def create_app() -> FastAPI:
    cfg = settings()

    @asynccontextmanager
    async def lifespan(app):
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
        yield

    app = FastAPI(title="AounOS", version="0.1.0", lifespan=lifespan)
    app.add_middleware(BodyLimit)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.allowed_origins.split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.state.requests = defaultdict(deque)
    app.state.slots = asyncio.Semaphore(cfg.max_concurrent_requests)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(
            {"detail": "Invalid message or history. Messages must be 1–500 characters."}, status_code=422
        )

    @app.middleware("http")
    async def headers(request, call_next):
        response = await call_next(request)
        response.headers.update(
            {
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "X-Frame-Options": "DENY",
                "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
            }
        )
        return response

    @app.get("/api/health")
    def health():
        if cfg.demo_mode:
            return {"status": "ok", "mode": "demo", "ready": True}
        ready = False
        if cfg.gemini_api_key.get_secret_value():
            try:
                rag._collection()
                ready = True
            except Exception:
                pass
        return {"status": "ok", "mode": "live", "ready": ready}

    @app.get("/api/ready")
    def readiness():
        state = health()
        return JSONResponse(state, status_code=200 if state["ready"] else 503)

    @app.post("/api/chat")
    async def chat(payload: ChatRequest, request: Request):
        try:
            question = rag.clean_question(payload.message)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        now = time.monotonic()
        # One process limiter; reverse proxy must enforce distributed/global budgets in production.
        buckets = app.state.requests
        for key in list(buckets):
            while buckets[key] and buckets[key][0] <= now - 60:
                buckets[key].popleft()
            if not buckets[key]:
                del buckets[key]
        host = request.client.host if request.client else "unknown"
        if host not in buckets and len(buckets) >= 10000:
            raise HTTPException(503, "The assistant is busy. Please try shortly.")
        if len(buckets[host]) >= cfg.rate_limit_per_minute:
            raise HTTPException(
                429, "Please wait a minute before sending another message.", headers={"Retry-After": "60"}
            )
        buckets[host].append(now)
        try:
            await asyncio.wait_for(app.state.slots.acquire(), timeout=0.1)
        except TimeoutError as exc:
            raise HTTPException(503, "The assistant is busy. Please try shortly.") from exc
        request_id, started = uuid.uuid4().hex[:12], time.perf_counter()
        history = [turn.model_dump() for turn in payload.history]
        try:
            if cfg.demo_mode:
                reply, chunks = await run_in_threadpool(demo.answer, question, history)
                messages = []
            else:
                messages, chunks = await run_in_threadpool(rag.prepare, question, history)
                reply = ""
            sources = await run_in_threadpool(rag.public_sources, chunks)
        except asyncio.CancelledError:
            app.state.slots.release()
            raise
        except Exception as exc:
            app.state.slots.release()
            log.warning("prepare_failed request_id=%s error_type=%s", request_id, type(exc).__name__)
            raise HTTPException(503, "The assistant isn't ready right now. Please try again later.") from exc

        async def stream():
            iterator, info, length = None, {}, 0
            try:
                yield event(
                    "sources",
                    {
                        "sources": sources,
                        "mode": "demo" if cfg.demo_mode else "live",
                        "request_id": request_id,
                    },
                )
                if cfg.demo_mode:
                    iterator = iter(reply[i : i + 28] for i in range(0, len(reply), 28))
                    info["provider"] = "offline"
                else:
                    iterator = rag.stream_reply(messages, info)
                while True:
                    if await request.is_disconnected():
                        break
                    piece, finished = await run_in_threadpool(advance, iterator)
                    if finished:
                        elapsed = round((time.perf_counter() - started) * 1000)
                        yield event("done", {"provider": info.get("provider"), "elapsed_ms": elapsed})
                        log.info(
                            "chat_completed request_id=%s provider=%s elapsed_ms=%s output_chars=%s",
                            request_id,
                            info.get("provider"),
                            elapsed,
                            length,
                        )
                        break
                    length += len(piece)
                    yield event("token", {"text": piece})
                    if cfg.demo_mode:
                        await asyncio.sleep(0.012)
            except Exception as exc:
                log.warning("stream_failed request_id=%s error_type=%s", request_id, type(exc).__name__)
                yield event(
                    "error",
                    {"message": "The response was interrupted. Please retry.", "request_id": request_id},
                )
            finally:
                try:
                    if iterator is not None and hasattr(iterator, "close"):
                        await run_in_threadpool(iterator.close)
                finally:
                    app.state.slots.release()

        return StreamingResponse(
            stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-store",
                "X-Accel-Buffering": "no",
                "X-Request-ID": request_id,
            },
        )

    dist = ROOT / "frontend" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="web")
    return app


app = create_app()

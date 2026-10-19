"""
main.py — FastAPI application factory and server entry-point.

Run in development:
    python main.py
    # OR
    uvicorn main:app --reload --port 8001

Run in production (via Docker / process manager):
    uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
"""

from __future__ import annotations

import time

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from logger import get_logger
from routes import router

log = get_logger(__name__)
settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Document Ingestion Service",
        description=(
            "Extracts structured text and image content from PDF/PPT/PPTX uploads "
            "for the hackathon evaluation AI pipeline. "
            "This service is intentionally decoupled from the AI evaluator: "
            "it only produces structured extraction results and never scores them."
        ),
        version="1.0.0",
        docs_url="/docs" if settings.env == "development" else None,
        redoc_url="/redoc" if settings.env == "development" else None,
        openapi_url="/openapi.json" if settings.env == "development" else None,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Allow any origin in dev; lock down in production via an env var if needed.
    allowed_origins = ["*"] if settings.env == "development" else []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Service-Token"],
    )

    # ── Request logging middleware ────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        log.info(
            "http.request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception):
        log.error(
            "http.unhandled_error",
            path=request.url.path,
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred.",
                    "detail": str(exc) if settings.env == "development" else None,
                }
            },
        )

    # ── Register routes ───────────────────────────────────────────────────────
    app.include_router(router, prefix="/api/v1")

    @app.on_event("startup")
    async def on_startup():
        log.info(
            "service.startup",
            env=settings.env,
            ocr=settings.ocr_available,
            supabase=settings.supabase_configured,
            max_mb=settings.max_file_size_mb,
        )

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
        log_level=settings.log_level.lower(),
    )

"""
routes.py — FastAPI route definitions for the document ingestion API.

Endpoints
─────────
  POST /ingest
    Accepts a multipart/form-data request with a document file and optional
    submission_id form field. Runs the full pipeline synchronously and returns
    an IngestResponse.

  GET /extraction/{job_id}
    Retrieve a previously stored extraction result by job_id.

  GET /extractions
    List stored extraction summaries, with optional submission_id filter.

  GET /health
    Liveness probe — returns 200 OK with service info.

Auth / security
───────────────
  When SERVICE_SECRET_TOKEN is set in the environment, all mutating endpoints
  (POST /ingest) require the caller to include:
    X-Service-Token: <token>
  GET endpoints are unauthenticated (the results contain no PII).
"""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse

from config import get_settings
from logger import get_logger
from models import ErrorDetail, ErrorResponse, ExtractionStatus, IngestResponse
from pipeline import run_pipeline
import storage as storage_module

log = get_logger(__name__)
router = APIRouter()

# Allowed file name characters: alphanumeric, dash, underscore, dot, space
_SAFE_FILENAME_RE = re.compile(r"[^\w\-. ]+", re.ASCII)


def _sanitise_filename(name: str) -> str:
    """Strip path traversal components and unsafe characters."""
    # Take only the basename (no directory separators)
    name = Path(name).name
    # Replace runs of unsafe chars with underscores
    name = _SAFE_FILENAME_RE.sub("_", name)
    return name[:255] or "upload"


def _verify_token(token: str | None) -> None:
    settings = get_settings()
    if not settings.service_secret_token:
        return  # Auth disabled in dev
    if token != settings.service_secret_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Service-Token header.",
        )


# ── POST /ingest ──────────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Ingest a document",
    description=(
        "Upload a PDF, PPT, or PPTX file. "
        "The service extracts text, detects image-heavy pages, runs OCR where needed, "
        "and returns fully structured page-level content. "
        "The result is also persisted to Supabase for the AI evaluator to consume."
    ),
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file or parameters"},
        401: {"model": ErrorResponse, "description": "Missing or invalid service token"},
        413: {"model": ErrorResponse, "description": "File exceeds size limit"},
    },
)
async def ingest_document(
    file: UploadFile = File(..., description="PDF, PPT, or PPTX document"),
    submission_id: str | None = Form(
        None,
        description="Optional submission id from the caller (stored verbatim)",
    ),
    x_service_token: str | None = Header(None, alias="X-Service-Token"),
) -> IngestResponse:
    _verify_token(x_service_token)

    settings = get_settings()

    # ── File name and extension ───────────────────────────────────────────────
    raw_name = file.filename or "upload.bin"
    safe_name = _sanitise_filename(raw_name)
    ext = Path(safe_name).suffix.lstrip(".").lower()

    if ext not in settings.allowed_ext_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '.{ext}' is not supported. Allowed: pdf, ppt, pptx.",
        )

    # ── Read bytes ────────────────────────────────────────────────────────────
    data = await file.read()
    size_bytes = len(data)

    log.info(
        "routes.ingest_received",
        file=safe_name,
        size_bytes=size_bytes,
        submission_id=submission_id,
    )

    if size_bytes > settings.max_file_size_bytes:
        mb = size_bytes / 1024 / 1024
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File is too large ({mb:.1f} MB). "
                f"Maximum allowed size is {settings.max_file_size_mb} MB."
            ),
        )

    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # ── Run pipeline ──────────────────────────────────────────────────────────
    result, storage_path = await run_pipeline(
        data=data,
        file_name=safe_name,
        file_extension=ext,
        submission_id=submission_id,
    )

    pages_with_images = sum(1 for p in result.pages if p.has_images)
    pages_with_ocr = sum(1 for p in result.pages if p.ocr_text)

    return IngestResponse(
        job_id=result.job_id,
        submission_id=result.submission_id,
        status=result.status,
        total_pages=result.total_pages,
        pages_with_images=pages_with_images,
        pages_with_ocr=pages_with_ocr,
        storage_path=storage_path,
        result=result,
    )


# ── GET /extraction/{job_id} ──────────────────────────────────────────────────

@router.get(
    "/extraction/{job_id}",
    summary="Retrieve extraction result",
    description="Fetch a previously stored extraction result by its job_id UUID.",
    responses={
        404: {"model": ErrorResponse, "description": "Job not found"},
    },
)
async def get_extraction(job_id: str) -> dict:
    result = await storage_module.get_extraction(job_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction job '{job_id}' not found.",
        )
    return result.model_dump()


# ── GET /extractions ──────────────────────────────────────────────────────────

@router.get(
    "/extractions",
    summary="List extraction summaries",
    description="List stored extraction summaries. Filter by submission_id if needed.",
)
async def list_extractions(
    submission_id: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    if limit > 200:
        limit = 200
    rows = await storage_module.list_extractions(
        submission_id=submission_id,
        limit=limit,
        offset=offset,
    )
    return {"extractions": rows, "count": len(rows)}


# ── GET /health ───────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Liveness check",
    description="Returns service health and configuration info. Always 200 when the service is up.",
)
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "doc-ingestion",
        "env": settings.env,
        "ocr_available": settings.ocr_available,
        "supabase_configured": settings.supabase_configured,
        "max_file_size_mb": settings.max_file_size_mb,
        "allowed_types": sorted(settings.allowed_ext_set),
    }

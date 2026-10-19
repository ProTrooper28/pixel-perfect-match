"""
pipeline.py — Document ingestion pipeline orchestrator.

This is the single entry-point for the processing logic.
The FastAPI route handlers call `run_pipeline` and receive an ExtractionResult.

Pipeline steps
──────────────
1. Validate file type and size.
2. Detect file type (extension-based + magic-byte fallback).
3. Dispatch to the appropriate extractor.
4. Aggregate pages into the top-level result.
5. Persist to Supabase (fire-and-forget; never blocks the API response).

Isolation guarantee
───────────────────
• No import from `routes.py` — the pipeline has no HTTP dependency.
• No import from `storage.py` for the extraction logic — storage is called
  last, always, and its failure never corrupts the extraction result.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from config import get_settings
from extractors import extract_document
from logger import get_logger
from models import ExtractionResult, ExtractionStatus, FileType, PageExtraction
import storage as storage_module

log = get_logger(__name__)

# Magic byte signatures for file type verification
_MAGIC: dict[bytes, FileType] = {
    b"%PDF": FileType.PDF,
    b"PK\x03\x04": FileType.PPTX,   # ZIP-based; PPTX is a ZIP archive
    b"\xd0\xcf\x11\xe0": FileType.PPT,  # OLE2 compound document (binary PPT)
}


def _detect_file_type(data: bytes, extension: str) -> FileType:
    """
    Determine file type from magic bytes, falling back to extension.

    Raises ValueError when the type is unknown or disallowed.
    """
    settings = get_settings()
    ext = extension.lower().lstrip(".")

    if ext not in settings.allowed_ext_set:
        raise ValueError(
            f"File extension '.{ext}' is not allowed. "
            f"Accepted types: {', '.join(sorted(settings.allowed_ext_set))}"
        )

    # Try magic bytes first (more reliable than extensions for uploads)
    for magic, ftype in _MAGIC.items():
        if data[: len(magic)] == magic:
            # Special case: PPTX is also a ZIP — check file extension to
            # distinguish it from DOCX/XLSX which share the same magic bytes.
            if ftype == FileType.PPTX and ext not in ("pptx", "ppt"):
                continue
            return ftype

    # Fall back to extension
    try:
        return FileType(ext)
    except ValueError:
        raise ValueError(f"Cannot determine file type for extension '.{ext}'") from None


def _aggregate(
    job_id: str,
    submission_id: str | None,
    file_name: str,
    file_type: FileType,
    file_size: int,
    pages: list[PageExtraction],
    error: str | None = None,
) -> ExtractionResult:
    """Build the top-level ExtractionResult from page extractions."""
    now = datetime.now(timezone.utc).isoformat()

    failed_pages = [p for p in pages if p.extraction_error]
    if error:
        status = ExtractionStatus.FAILED
    elif not pages:
        status = ExtractionStatus.FAILED
        error = "No pages were extracted"
    elif failed_pages and len(failed_pages) < len(pages):
        status = ExtractionStatus.PARTIAL
    elif failed_pages:
        status = ExtractionStatus.FAILED
        error = f"All {len(failed_pages)} pages failed to extract"
    else:
        status = ExtractionStatus.COMPLETED

    full_text = "\n\n".join(p.text for p in pages if p.text)
    full_ocr_text = "\n\n".join(p.ocr_text for p in pages if p.ocr_text)

    return ExtractionResult(
        job_id=job_id,
        submission_id=submission_id,
        file_name=file_name,
        file_type=file_type,
        file_size_bytes=file_size,
        total_pages=len(pages),
        status=status,
        pages=pages,
        full_text=full_text,
        full_ocr_text=full_ocr_text,
        error=error,
        created_at=now,
        completed_at=now if status != ExtractionStatus.PROCESSING else None,
    )


async def run_pipeline(
    data: bytes,
    file_name: str,
    file_extension: str,
    submission_id: str | None = None,
) -> tuple[ExtractionResult, str | None]:
    """
    Run the full ingestion pipeline for one uploaded file.

    Args:
        data:           Raw file bytes.
        file_name:      Original file name (sanitised by the route before calling here).
        file_extension: File extension WITHOUT leading dot (e.g. "pdf").
        submission_id:  Optional caller-provided submission identifier.

    Returns:
        (result, storage_path)
        • result:       The fully populated ExtractionResult.
        • storage_path: Supabase Storage path for the persisted JSON (or None).

    This function never raises — all errors are captured into the result.
    """
    settings = get_settings()
    job_id = str(uuid.uuid4())

    log.info(
        "pipeline.start",
        job_id=job_id,
        file=file_name,
        size_bytes=len(data),
        submission_id=submission_id,
    )

    # ── Validate size ─────────────────────────────────────────────────────────
    if len(data) > settings.max_file_size_bytes:
        mb = len(data) / 1024 / 1024
        result = _aggregate(
            job_id=job_id,
            submission_id=submission_id,
            file_name=file_name,
            file_type=FileType.PDF,           # placeholder — type unknown at this point
            file_size=len(data),
            pages=[],
            error=f"File is too large ({mb:.1f} MB). Maximum is {settings.max_file_size_mb} MB.",
        )
        log.warning("pipeline.file_too_large", job_id=job_id, size_mb=round(mb, 1))
        return result, None

    # ── Detect file type ──────────────────────────────────────────────────────
    try:
        file_type = _detect_file_type(data, file_extension)
    except ValueError as exc:
        result = _aggregate(
            job_id=job_id,
            submission_id=submission_id,
            file_name=file_name,
            file_type=FileType.PDF,
            file_size=len(data),
            pages=[],
            error=str(exc),
        )
        log.warning("pipeline.bad_file_type", job_id=job_id, error=str(exc))
        return result, None

    # ── Extract ───────────────────────────────────────────────────────────────
    pages: list[PageExtraction] = []
    pipeline_error: str | None = None

    try:
        pages = extract_document(data=data, file_name=file_name, file_type=file_type)
    except Exception as exc:
        pipeline_error = str(exc)
        log.error("pipeline.extraction_failed", job_id=job_id, error=pipeline_error)

    # ── Build result ──────────────────────────────────────────────────────────
    result = _aggregate(
        job_id=job_id,
        submission_id=submission_id,
        file_name=file_name,
        file_type=file_type,
        file_size=len(data),
        pages=pages,
        error=pipeline_error,
    )

    log.info(
        "pipeline.done",
        job_id=job_id,
        status=result.status,
        total_pages=result.total_pages,
        images=sum(len(p.images) for p in pages),
        has_ocr=bool(result.full_ocr_text),
    )

    # ── Persist (fire-and-forget; failure never aborts API response) ──────────
    storage_path: str | None = None
    try:
        storage_path = await storage_module.persist_result(result)
    except Exception as exc:
        log.error("pipeline.persist_failed", job_id=job_id, error=str(exc))

    return result, storage_path

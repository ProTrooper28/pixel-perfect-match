"""
storage.py — Supabase Storage adapter for the ingestion service.

Responsibilities
────────────────
• Upload extraction result JSON to Supabase Storage (documents bucket).
• Upsert a summary row in the `document_extractions` table.
• Provide a typed `get_extraction` lookup for downstream services.
• All operations silently degrade (log + return None) when Supabase
  is not configured, so the service still returns extraction data in
  development even without database credentials.

Table contract (see supabase/migrations/0004_document_extractions.sql)
──────────────────────────────────────────────────────────────────────
  document_extractions
    id             uuid PK
    submission_id  text nullable
    file_name      text
    file_type      text
    file_size_bytes bigint
    total_pages    int
    status         text
    storage_path   text nullable   -- JSON blob in Supabase Storage
    full_text      text
    full_ocr_text  text
    error          text nullable
    created_at     timestamptz
    completed_at   timestamptz nullable
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from config import get_settings
from logger import get_logger
from models import ExtractionResult, ExtractionStatus

log = get_logger(__name__)

_supabase_client = None


def _get_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    settings = get_settings()
    if not settings.supabase_configured:
        return None

    try:
        from supabase import create_client  # type: ignore[import]

        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        log.info("storage.supabase_ready")
        return _supabase_client
    except Exception as exc:
        log.error("storage.supabase_init_failed", error=str(exc))
        return None


def _storage_path(job_id: str, file_name: str) -> str:
    """Return the Supabase Storage object path for a job's result JSON."""
    safe_name = file_name.replace("/", "_").replace(" ", "_")
    return f"extractions/{job_id}/{safe_name}.result.json"


async def persist_result(result: ExtractionResult) -> str | None:
    """
    Upload `result` to Supabase Storage and upsert a summary row.

    Returns:
        The storage path on success, or None when Supabase is not configured
        or the operation fails.
    """
    client = _get_client()
    if client is None:
        log.warning("storage.skipped_not_configured", job_id=result.job_id)
        return None

    settings = get_settings()
    path = _storage_path(result.job_id, result.file_name)
    result_json = result.model_dump_json(indent=None).encode()

    # ── Upload JSON blob ──────────────────────────────────────────────────────
    try:
        client.storage.from_(settings.supabase_documents_bucket).upload(
            path=path,
            file=result_json,
            file_options={"content-type": "application/json", "upsert": "true"},
        )
        log.info("storage.uploaded", job_id=result.job_id, path=path)
    except Exception as exc:
        log.error("storage.upload_failed", job_id=result.job_id, error=str(exc))
        # Don't abort — still try to write the DB row

    # ── Upsert summary row ────────────────────────────────────────────────────
    row: dict[str, Any] = {
        "id": result.job_id,
        "submission_id": result.submission_id,
        "file_name": result.file_name,
        "file_type": result.file_type.value,
        "file_size_bytes": result.file_size_bytes,
        "total_pages": result.total_pages,
        "status": result.status.value,
        "storage_path": path,
        "full_text": result.full_text[:65535],        # guard column length
        "full_ocr_text": result.full_ocr_text[:65535],
        "error": result.error,
        "created_at": result.created_at
        or datetime.now(timezone.utc).isoformat(),
        "completed_at": result.completed_at,
    }

    try:
        client.table("document_extractions").upsert(row).execute()
        log.info("storage.row_upserted", job_id=result.job_id)
        return path
    except Exception as exc:
        log.error("storage.row_upsert_failed", job_id=result.job_id, error=str(exc))
        return path  # Storage upload succeeded; row failure is non-fatal


async def get_extraction(job_id: str) -> ExtractionResult | None:
    """
    Retrieve a previously stored extraction result by job_id.

    Returns None when not found or Supabase is unavailable.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        response = (
            client.table("document_extractions")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        row = response.data
        if not row:
            return None

        settings = get_settings()
        storage_path = row.get("storage_path")
        if not storage_path:
            return None

        # Download the full JSON blob from Storage
        blob = client.storage.from_(settings.supabase_documents_bucket).download(
            storage_path
        )
        return ExtractionResult.model_validate_json(blob)

    except Exception as exc:
        log.error("storage.get_failed", job_id=job_id, error=str(exc))
        return None


async def list_extractions(
    submission_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """
    List stored extraction summaries (without full page data).

    Args:
        submission_id: Filter to a specific submission when provided.
        limit:         Maximum rows to return (capped at 200).
        offset:        Pagination offset.
    """
    client = _get_client()
    if client is None:
        return []

    limit = min(limit, 200)

    try:
        query = (
            client.table("document_extractions")
            .select(
                "id, submission_id, file_name, file_type, total_pages, "
                "status, storage_path, created_at, completed_at, error"
            )
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if submission_id:
            query = query.eq("submission_id", submission_id)

        response = query.execute()
        return response.data or []

    except Exception as exc:
        log.error("storage.list_failed", error=str(exc))
        return []

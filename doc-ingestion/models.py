"""
models.py — Pydantic data models for request/response contracts.

These are the canonical types shared between all internal modules.
The AI evaluator consumes `ExtractionResult` (or its stored JSON equivalent).
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class FileType(str, Enum):
    PDF = "pdf"
    PPT = "ppt"
    PPTX = "pptx"


class ImageInfo(BaseModel):
    """Metadata for an embedded image found on a page/slide."""

    index: int = Field(..., description="0-based image index within the page/slide")
    width: int
    height: int
    format: str = Field(..., description="e.g. 'PNG', 'JPEG'")
    storage_path: str | None = Field(
        None,
        description="Supabase Storage path when the image was persisted",
    )
    ocr_text: str | None = Field(
        None,
        description="OCR output from Google Cloud Vision for this image",
    )
    ocr_confidence: float | None = Field(
        None,
        description="Mean confidence score returned by the OCR provider (0–1)",
    )
    ocr_error: str | None = Field(
        None,
        description="Set when OCR was attempted but failed for this image only",
    )


class PageExtraction(BaseModel):
    """Structured extraction for a single page (PDF) or slide (PPT/PPTX)."""

    page: int = Field(..., description="1-based page/slide number")
    text: str = Field(
        "",
        description="Native text extracted directly from the document layer",
    )
    ocr_text: str = Field(
        "",
        description="Concatenated OCR text from all images on this page",
    )
    images: list[ImageInfo] = Field(
        default_factory=list,
        description="Metadata for each embedded image found",
    )
    has_images: bool = Field(False, description="True when at least one image is present")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Page-level metadata such as slide title, notes (PPTX), "
            "PDF page labels, bounding boxes, etc."
        ),
    )
    extraction_error: str | None = Field(
        None,
        description="Set when this page/slide encountered a non-fatal extraction error",
    )


class ExtractionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL = "partial"       # some pages failed, rest OK
    FAILED = "failed"


class ExtractionResult(BaseModel):
    """
    Top-level extraction envelope returned by the API and stored in Supabase.

    This is the contract the AI evaluator consumes.  It is deliberately
    self-contained: the evaluator never needs to call this service again to
    reconstruct the document's textual content.
    """

    job_id: str = Field(..., description="UUID, also the Supabase row PK")
    submission_id: str | None = Field(
        None,
        description=(
            "Hackathon submission id this document belongs to; "
            "set by the caller, not generated here"
        ),
    )
    file_name: str
    file_type: FileType
    file_size_bytes: int
    total_pages: int
    status: ExtractionStatus
    pages: list[PageExtraction] = Field(default_factory=list)
    # Convenience aggregates (computed, not stored separately)
    full_text: str = Field(
        "",
        description="Concatenation of all page `text` fields",
    )
    full_ocr_text: str = Field(
        "",
        description="Concatenation of all page `ocr_text` fields",
    )
    error: str | None = Field(
        None,
        description="Set when `status` is `failed`; describes the root cause",
    )
    created_at: str | None = None
    completed_at: str | None = None


# ─── Request / Response wrappers ─────────────────────────────────────────────

class IngestRequest(BaseModel):
    """
    Metadata the caller provides alongside the uploaded file.
    Sent as form fields in a multipart/form-data request.
    """

    submission_id: str | None = Field(
        None,
        description="Caller's submission id — stored verbatim for the AI evaluator",
    )


class IngestResponse(BaseModel):
    """Immediate response — the full extraction result."""

    job_id: str
    submission_id: str | None
    status: ExtractionStatus
    total_pages: int
    pages_with_images: int
    pages_with_ocr: int
    storage_path: str | None = Field(
        None,
        description="Supabase Storage path where the result JSON is persisted",
    )
    result: ExtractionResult


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail

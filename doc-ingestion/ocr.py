"""
ocr.py — Google Cloud Vision OCR adapter.

Design principles
─────────────────
• This module is the ONLY place that knows about Google Cloud Vision.
• If OCR is not configured (`Settings.ocr_available == False`), every
  public function returns an empty string + a warning log — no crash.
• Image bytes are always discarded after the API call; we never log them.
• Errors on a single image are caught and returned as `ocr_error` on the
  `ImageInfo` model; they do not abort the whole extraction.
• Retries (tenacity) handle transient quota / network errors.
"""

from __future__ import annotations

import io
import json
import os
from typing import TYPE_CHECKING

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import get_settings
from logger import get_logger

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage

log = get_logger(__name__)

_client = None  # lazy singleton


def _get_client():
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.ocr_available:
        return None

    try:
        from google.cloud import vision  # type: ignore[import]

        # Prefer inline JSON credentials (useful in containers / CI)
        if settings.google_cloud_vision_credentials_json:
            import google.auth  # type: ignore[import]
            import google.oauth2.service_account as sa  # type: ignore[import]

            info = json.loads(settings.google_cloud_vision_credentials_json)
            creds = sa.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            _client = vision.ImageAnnotatorClient(credentials=creds)
        else:
            # Fall back to GOOGLE_APPLICATION_CREDENTIALS file path (already set in env)
            if settings.google_application_credentials:
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = (
                    settings.google_application_credentials
                )
            _client = vision.ImageAnnotatorClient()

        log.info("ocr.client_ready")
        return _client

    except Exception as exc:
        log.error("ocr.client_init_failed", error=str(exc))
        return None


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
def _call_vision_api(image_bytes: bytes) -> tuple[str, float | None]:
    """
    Call Google Cloud Vision TEXT_DETECTION.

    Returns:
        (extracted_text, mean_confidence)
    Raises on hard failures so tenacity can retry.
    """
    from google.cloud import vision  # type: ignore[import]

    client = _get_client()
    if client is None:
        return "", None

    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotations = response.text_annotations
    if not annotations:
        return "", None

    full_text = annotations[0].description.strip()

    # Compute mean confidence from individual word annotations (page-level)
    confidences: list[float] = []
    for page in response.full_text_annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    if word.confidence is not None:
                        confidences.append(word.confidence)

    mean_conf = sum(confidences) / len(confidences) if confidences else None
    return full_text, mean_conf


def run_ocr(
    image_bytes: bytes,
    page_num: int,
    image_idx: int,
) -> tuple[str, float | None, str | None]:
    """
    Public OCR entry-point for a single image.

    Args:
        image_bytes: Raw image bytes (PNG/JPEG/etc.)
        page_num:    1-based page number (for logging)
        image_idx:   0-based image index within the page

    Returns:
        (ocr_text, confidence, error_message)
        • error_message is None on success.
    """
    settings = get_settings()

    if not settings.ocr_available:
        log.debug(
            "ocr.skipped_not_configured",
            page=page_num,
            image_index=image_idx,
        )
        return "", None, None

    if not image_bytes:
        return "", None, "Empty image bytes"

    try:
        text, confidence = _call_vision_api(image_bytes)
        log.info(
            "ocr.success",
            page=page_num,
            image_index=image_idx,
            chars=len(text),
            confidence=round(confidence, 3) if confidence else None,
        )
        return text, confidence, None
    except Exception as exc:
        msg = str(exc)
        log.warning(
            "ocr.failed",
            page=page_num,
            image_index=image_idx,
            error=msg,
        )
        return "", None, msg


def pil_image_to_bytes(img: "PILImage", fmt: str = "PNG") -> bytes:
    """Convert a Pillow Image to raw bytes for the Vision API."""
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()

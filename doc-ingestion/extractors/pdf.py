"""
extractors/pdf.py — PDF text and image extraction via PyMuPDF (fitz).

Responsibilities
────────────────
• Open the PDF from bytes (never writes to disk).
• For each page:
    – Extract native text via page.get_text("text").
    – Extract all embedded images (pixmaps → PNG bytes).
    – Call OCR on each image via the `ocr` module.
    – Collect page-level metadata (label, rotation, width/height).
• Return a list[PageExtraction] preserving 1-based page order.
• Per-page errors are caught and stored as `extraction_error`; the
  rest of the document continues to be processed.
"""

from __future__ import annotations

import io
from typing import TYPE_CHECKING

import fitz  # PyMuPDF

from logger import get_logger
from models import ImageInfo, PageExtraction
from ocr import run_ocr

if TYPE_CHECKING:
    pass

log = get_logger(__name__)

# Minimum pixel area — skip tiny decorative images (icons, bullets, etc.)
_MIN_IMAGE_AREA = 80 * 80  # px²


def extract_pdf(data: bytes, file_name: str) -> list[PageExtraction]:
    """
    Extract all pages from PDF bytes.

    Args:
        data:      Raw PDF bytes.
        file_name: Original file name (used only for logging).

    Returns:
        list[PageExtraction] in page order (1-based `page` field).
    """
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        log.error("pdf.open_failed", file=file_name, error=str(exc))
        raise ValueError(f"Cannot open PDF '{file_name}': {exc}") from exc

    results: list[PageExtraction] = []
    total = doc.page_count
    log.info("pdf.start", file=file_name, pages=total)

    for page_num in range(total):
        page_1based = page_num + 1
        try:
            page_extraction = _process_page(doc, page_num, page_1based, file_name)
        except Exception as exc:
            log.error(
                "pdf.page_failed",
                file=file_name,
                page=page_1based,
                error=str(exc),
            )
            page_extraction = PageExtraction(
                page=page_1based,
                extraction_error=str(exc),
            )
        results.append(page_extraction)

    doc.close()
    log.info("pdf.done", file=file_name, pages=total)
    return results


def _process_page(
    doc: fitz.Document,
    page_idx: int,
    page_num: int,
    file_name: str,
) -> PageExtraction:
    page = doc[page_idx]

    # ── Native text ───────────────────────────────────────────────────────────
    native_text = page.get_text("text").strip()

    # ── Metadata ──────────────────────────────────────────────────────────────
    meta: dict = {
        "width_pt": round(page.rect.width, 2),
        "height_pt": round(page.rect.height, 2),
        "rotation": page.rotation,
    }
    label = page.get_label()
    if label:
        meta["label"] = label

    # ── Image extraction + OCR ───────────────────────────────────────────────
    images: list[ImageInfo] = []
    ocr_parts: list[str] = []
    image_list = page.get_images(full=True)

    for img_idx, img_ref in enumerate(image_list):
        xref = img_ref[0]
        try:
            pix = fitz.Pixmap(doc, xref)

            # Skip tiny decorative images
            if pix.width * pix.height < _MIN_IMAGE_AREA:
                pix = None
                continue

            # Convert CMYK → RGB so Pillow / Vision can process it
            if pix.n > 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)

            img_bytes = pix.tobytes("png")
            fmt = "PNG"
            pix = None  # free immediately

            ocr_text, confidence, ocr_error = run_ocr(img_bytes, page_num, img_idx)

            if ocr_text:
                ocr_parts.append(ocr_text)

            # Recover original image dimensions from xref info
            img_info = doc.extract_image(xref)
            w = img_info.get("width", 0)
            h = img_info.get("height", 0)

            images.append(
                ImageInfo(
                    index=img_idx,
                    width=w,
                    height=h,
                    format=fmt,
                    ocr_text=ocr_text or None,
                    ocr_confidence=round(confidence, 4) if confidence is not None else None,
                    ocr_error=ocr_error,
                )
            )

        except Exception as exc:
            log.warning(
                "pdf.image_failed",
                file=file_name,
                page=page_num,
                image_index=img_idx,
                error=str(exc),
            )
            images.append(
                ImageInfo(
                    index=img_idx,
                    width=0,
                    height=0,
                    format="unknown",
                    ocr_error=str(exc),
                )
            )

    return PageExtraction(
        page=page_num,
        text=native_text,
        ocr_text="\n\n".join(ocr_parts),
        images=images,
        has_images=len(images) > 0,
        metadata=meta,
    )

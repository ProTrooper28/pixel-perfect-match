"""
extractors/pptx.py — PPTX (and legacy PPT via LibreOffice conversion) extraction.

Responsibilities
────────────────
• Parse PPTX bytes with python-pptx.
• For each slide:
    – Extract native text from all text-frame shapes (preserving paragraph order).
    – Extract the slide title + speaker notes as metadata.
    – Detect embedded images (Picture shapes) and run OCR on them.
• PPT (binary): attempt conversion to PPTX via LibreOffice in a subprocess
  (optional; gracefully disabled when LibreOffice is absent).
• Per-slide errors never abort the full extraction.
"""

from __future__ import annotations

import io
import subprocess
import tempfile
from pathlib import Path

from pptx import Presentation  # type: ignore[import]
from pptx.enum.shapes import MSO_SHAPE_TYPE  # type: ignore[import]
from pptx.util import Pt  # type: ignore[import]

from logger import get_logger
from models import ImageInfo, PageExtraction
from ocr import pil_image_to_bytes, run_ocr

log = get_logger(__name__)


# ── PPT → PPTX conversion (best-effort) ──────────────────────────────────────

def _convert_ppt_to_pptx(ppt_bytes: bytes) -> bytes | None:
    """
    Try to convert a binary PPT to PPTX via LibreOffice headless.

    Returns converted bytes or None when LibreOffice is unavailable or fails.
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / "input.ppt"
            tmp_path.write_bytes(ppt_bytes)

            result = subprocess.run(
                [
                    "libreoffice",
                    "--headless",
                    "--convert-to",
                    "pptx",
                    "--outdir",
                    tmpdir,
                    str(tmp_path),
                ],
                capture_output=True,
                timeout=120,
            )

            if result.returncode != 0:
                log.warning(
                    "ppt.libreoffice_failed",
                    stderr=result.stderr.decode(errors="replace")[:500],
                )
                return None

            out_path = Path(tmpdir) / "input.pptx"
            if not out_path.exists():
                log.warning("ppt.libreoffice_no_output")
                return None

            return out_path.read_bytes()

    except FileNotFoundError:
        log.warning("ppt.libreoffice_not_found")
        return None
    except Exception as exc:
        log.error("ppt.conversion_error", error=str(exc))
        return None


# ── PPTX extraction ───────────────────────────────────────────────────────────

def extract_pptx(data: bytes, file_name: str, is_ppt: bool = False) -> list[PageExtraction]:
    """
    Extract all slides from PPTX bytes.

    Args:
        data:      Raw PPTX (or PPT) bytes.
        file_name: Original file name (for logging).
        is_ppt:    True when the original file was .ppt (triggers conversion).

    Returns:
        list[PageExtraction] in slide order (1-based `page` field).
    """
    if is_ppt:
        log.info("ppt.converting", file=file_name)
        converted = _convert_ppt_to_pptx(data)
        if converted is None:
            raise ValueError(
                f"Cannot process '{file_name}': LibreOffice is required to parse "
                "binary .ppt files but was not found or failed. "
                "Convert the file to .pptx before uploading."
            )
        data = converted
        file_name = file_name.replace(".ppt", ".pptx")

    try:
        prs = Presentation(io.BytesIO(data))
    except Exception as exc:
        log.error("pptx.open_failed", file=file_name, error=str(exc))
        raise ValueError(f"Cannot open PPTX '{file_name}': {exc}") from exc

    results: list[PageExtraction] = []
    total = len(prs.slides)
    log.info("pptx.start", file=file_name, slides=total)

    for slide_idx, slide in enumerate(prs.slides):
        slide_num = slide_idx + 1
        try:
            slide_extraction = _process_slide(slide, slide_num, file_name)
        except Exception as exc:
            log.error(
                "pptx.slide_failed",
                file=file_name,
                slide=slide_num,
                error=str(exc),
            )
            slide_extraction = PageExtraction(
                page=slide_num,
                extraction_error=str(exc),
            )
        results.append(slide_extraction)

    log.info("pptx.done", file=file_name, slides=total)
    return results


def _process_slide(slide, slide_num: int, file_name: str) -> PageExtraction:  # noqa: ANN001
    from PIL import Image  # type: ignore[import]

    text_parts: list[str] = []
    images: list[ImageInfo] = []
    ocr_parts: list[str] = []
    title: str | None = None
    notes_text: str | None = None

    # ── Speaker notes ─────────────────────────────────────────────────────────
    try:
        notes_slide = slide.notes_slide
        if notes_slide and notes_slide.notes_text_frame:
            notes_text = notes_slide.notes_text_frame.text.strip() or None
    except Exception:
        pass  # Notes are optional; silence any error

    # ── Shapes ────────────────────────────────────────────────────────────────
    for shape_idx, shape in enumerate(slide.shapes):
        # ── Text frames ───────────────────────────────────────────────────────
        if shape.has_text_frame:
            shape_text = shape.text_frame.text.strip()
            if shape_text:
                # Capture the first text-containing shape as the slide title
                if title is None and shape.shape_type in (
                    MSO_SHAPE_TYPE.TEXT_BOX,
                    MSO_SHAPE_TYPE.AUTO_SHAPE,
                    13,  # MSO_SHAPE_TYPE.PLACEHOLDER
                ):
                    title = shape_text.split("\n")[0][:200]
                text_parts.append(shape_text)

        # ── Pictures (embedded images) ────────────────────────────────────────
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            try:
                img_blob = shape.image.blob
                img_format = shape.image.ext.upper()  # e.g. "PNG", "JPEG"

                # Convert to PIL to normalise format, then to bytes for Vision
                pil_img = Image.open(io.BytesIO(img_blob))
                w, h = pil_img.size

                # Skip tiny decorative images
                if w * h < 80 * 80:
                    continue

                png_bytes = pil_image_to_bytes(pil_img, fmt="PNG")
                pil_img.close()

                ocr_text, confidence, ocr_error = run_ocr(png_bytes, slide_num, shape_idx)

                if ocr_text:
                    ocr_parts.append(ocr_text)

                images.append(
                    ImageInfo(
                        index=shape_idx,
                        width=w,
                        height=h,
                        format=img_format,
                        ocr_text=ocr_text or None,
                        ocr_confidence=(
                            round(confidence, 4) if confidence is not None else None
                        ),
                        ocr_error=ocr_error,
                    )
                )
            except Exception as exc:
                log.warning(
                    "pptx.image_failed",
                    file=file_name,
                    slide=slide_num,
                    shape_index=shape_idx,
                    error=str(exc),
                )
                images.append(
                    ImageInfo(
                        index=shape_idx,
                        width=0,
                        height=0,
                        format="unknown",
                        ocr_error=str(exc),
                    )
                )

    # ── Slide metadata ────────────────────────────────────────────────────────
    meta: dict = {}
    if title:
        meta["title"] = title
    if notes_text:
        meta["notes"] = notes_text

    layout = slide.slide_layout
    if layout and layout.name:
        meta["layout"] = layout.name

    return PageExtraction(
        page=slide_num,
        text="\n".join(text_parts),
        ocr_text="\n\n".join(ocr_parts),
        images=images,
        has_images=len(images) > 0,
        metadata=meta,
    )

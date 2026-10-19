"""
extractors/__init__.py — Unified extraction dispatcher.

Public API
──────────
    from extractors import extract_document

    pages = extract_document(data=bytes, file_name="deck.pptx", file_type=FileType.PPTX)

The dispatcher routes to the correct extractor based on `FileType`.
All extractor modules stay isolated; this is the only module that imports them.
"""

from __future__ import annotations

from models import FileType, PageExtraction
from .pdf import extract_pdf
from .pptx import extract_pptx


def extract_document(
    data: bytes,
    file_name: str,
    file_type: FileType,
) -> list[PageExtraction]:
    """
    Dispatch extraction to the correct module.

    Args:
        data:      Raw file bytes (never written to disk by this function).
        file_name: Original file name (for logging / metadata only).
        file_type: Normalised FileType enum value.

    Returns:
        list[PageExtraction] in page/slide order.

    Raises:
        ValueError: When the file cannot be opened or the type is unsupported.
    """
    if file_type == FileType.PDF:
        return extract_pdf(data, file_name)
    elif file_type == FileType.PPTX:
        return extract_pptx(data, file_name, is_ppt=False)
    elif file_type == FileType.PPT:
        return extract_pptx(data, file_name, is_ppt=True)
    else:
        raise ValueError(f"Unsupported file type: {file_type!r}")


__all__ = ["extract_document"]

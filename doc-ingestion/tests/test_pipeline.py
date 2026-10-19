"""
tests/test_pipeline.py — Unit tests for the ingestion pipeline.

Run:
    pytest doc-ingestion/tests/ -v

These tests use only synthetic in-memory data and mock the OCR / Supabase
modules so no external credentials are required to run the test suite.
"""

from __future__ import annotations

import io
import json
import struct
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Helpers to create minimal valid file bytes ────────────────────────────────

def _minimal_pdf() -> bytes:
    """Return the smallest possible valid PDF (1 empty page)."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\n"
        b"startxref\n197\n%%EOF\n"
    )


# ── Pipeline tests ────────────────────────────────────────────────────────────

class TestDetectFileType:
    def test_pdf_magic(self):
        from pipeline import _detect_file_type
        from models import FileType

        data = b"%PDF-1.7 hello"
        assert _detect_file_type(data, "pdf") == FileType.PDF

    def test_pptx_magic(self):
        from pipeline import _detect_file_type
        from models import FileType

        data = b"PK\x03\x04" + b"\x00" * 100
        assert _detect_file_type(data, "pptx") == FileType.PPTX

    def test_ppt_magic(self):
        from pipeline import _detect_file_type
        from models import FileType

        data = b"\xd0\xcf\x11\xe0" + b"\x00" * 100
        assert _detect_file_type(data, "ppt") == FileType.PPT

    def test_disallowed_extension(self):
        from pipeline import _detect_file_type

        with pytest.raises(ValueError, match="not allowed"):
            _detect_file_type(b"garbage", "exe")

    def test_unknown_type_falls_back_to_extension(self):
        """Even without magic bytes, extension-based detection works."""
        from pipeline import _detect_file_type
        from models import FileType

        data = b"\x00" * 50  # no magic bytes
        result = _detect_file_type(data, "pdf")
        assert result == FileType.PDF


class TestAggregate:
    def test_completed_result(self):
        from pipeline import _aggregate
        from models import FileType, ExtractionStatus, PageExtraction

        pages = [
            PageExtraction(page=1, text="Hello world"),
            PageExtraction(page=2, text="Second page"),
        ]
        result = _aggregate(
            job_id="test-job",
            submission_id="project:abc",
            file_name="test.pdf",
            file_type=FileType.PDF,
            file_size=1024,
            pages=pages,
        )
        assert result.status == ExtractionStatus.COMPLETED
        assert result.total_pages == 2
        assert "Hello world" in result.full_text
        assert "Second page" in result.full_text

    def test_partial_when_some_pages_fail(self):
        from pipeline import _aggregate
        from models import FileType, ExtractionStatus, PageExtraction

        pages = [
            PageExtraction(page=1, text="Good page"),
            PageExtraction(page=2, extraction_error="Parse error on page 2"),
        ]
        result = _aggregate(
            job_id="test-job",
            submission_id=None,
            file_name="test.pdf",
            file_type=FileType.PDF,
            file_size=1024,
            pages=pages,
        )
        assert result.status == ExtractionStatus.PARTIAL

    def test_failed_when_no_pages(self):
        from pipeline import _aggregate
        from models import FileType, ExtractionStatus

        result = _aggregate(
            job_id="test-job",
            submission_id=None,
            file_name="bad.pdf",
            file_type=FileType.PDF,
            file_size=0,
            pages=[],
        )
        assert result.status == ExtractionStatus.FAILED
        assert result.error is not None

    def test_explicit_error_overrides_status(self):
        from pipeline import _aggregate
        from models import FileType, ExtractionStatus, PageExtraction

        result = _aggregate(
            job_id="test-job",
            submission_id=None,
            file_name="bad.pdf",
            file_type=FileType.PDF,
            file_size=0,
            pages=[PageExtraction(page=1)],
            error="Root cause",
        )
        assert result.status == ExtractionStatus.FAILED
        assert result.error == "Root cause"


class TestRunPipeline:
    @pytest.mark.asyncio
    async def test_file_too_large(self):
        with patch("pipeline.get_settings") as mock_settings:
            cfg = MagicMock()
            cfg.max_file_size_bytes = 10
            cfg.max_file_size_mb = 0
            cfg.allowed_ext_set = {"pdf"}
            mock_settings.return_value = cfg

            from pipeline import run_pipeline
            from models import ExtractionStatus

            result, path = await run_pipeline(
                data=b"x" * 100,
                file_name="big.pdf",
                file_extension="pdf",
            )

        assert result.status == ExtractionStatus.FAILED
        assert "too large" in (result.error or "").lower()
        assert path is None

    @pytest.mark.asyncio
    async def test_empty_file(self):
        """Empty file should be rejected by the route (before pipeline)."""
        # The route rejects empty files; the pipeline sees a valid but empty doc.
        # This just verifies the pipeline doesn't crash on empty bytes.
        from pipeline import run_pipeline
        from models import ExtractionStatus

        with patch("pipeline.extract_document", side_effect=ValueError("empty")):
            with patch("pipeline.storage_module.persist_result", new_callable=AsyncMock):
                result, _ = await run_pipeline(
                    data=b"",
                    file_name="empty.pdf",
                    file_extension="pdf",
                )

        assert result.status in (ExtractionStatus.FAILED, ExtractionStatus.PARTIAL)

    @pytest.mark.asyncio
    async def test_successful_pdf_extraction(self):
        from pipeline import run_pipeline
        from models import ExtractionStatus, PageExtraction

        mock_pages = [
            PageExtraction(page=1, text="Slide one content"),
            PageExtraction(page=2, text="Slide two content", has_images=True),
        ]

        with patch("pipeline.extract_document", return_value=mock_pages):
            with patch("pipeline.storage_module.persist_result", new_callable=AsyncMock, return_value="/path/result.json"):
                with patch("pipeline._detect_file_type") as mock_detect:
                    from models import FileType
                    mock_detect.return_value = FileType.PDF

                    result, path = await run_pipeline(
                        data=b"%PDF-1.4 fake",
                        file_name="deck.pdf",
                        file_extension="pdf",
                        submission_id="project:xyz",
                    )

        assert result.status == ExtractionStatus.COMPLETED
        assert result.total_pages == 2
        assert result.submission_id == "project:xyz"
        assert "Slide one content" in result.full_text
        assert path == "/path/result.json"


# ── OCR module tests ──────────────────────────────────────────────────────────

class TestOcr:
    def test_ocr_skipped_when_not_configured(self):
        with patch("ocr.get_settings") as mock_settings:
            cfg = MagicMock()
            cfg.ocr_available = False
            mock_settings.return_value = cfg

            from ocr import run_ocr
            text, conf, err = run_ocr(b"fake image", page_num=1, image_idx=0)

        assert text == ""
        assert conf is None
        assert err is None  # Not an error — just not configured

    def test_ocr_handles_empty_bytes(self):
        with patch("ocr.get_settings") as mock_settings:
            cfg = MagicMock()
            cfg.ocr_available = True
            mock_settings.return_value = cfg

            from ocr import run_ocr
            text, conf, err = run_ocr(b"", page_num=1, image_idx=0)

        assert text == ""
        assert err == "Empty image bytes"


# ── Model serialisation tests ─────────────────────────────────────────────────

class TestModels:
    def test_extraction_result_round_trip(self):
        from models import ExtractionResult, ExtractionStatus, FileType, PageExtraction

        result = ExtractionResult(
            job_id="abc-123",
            submission_id="project:xyz",
            file_name="presentation.pptx",
            file_type=FileType.PPTX,
            file_size_bytes=102400,
            total_pages=3,
            status=ExtractionStatus.COMPLETED,
            pages=[
                PageExtraction(page=1, text="Hello"),
                PageExtraction(page=2, text="World", has_images=True),
                PageExtraction(page=3),
            ],
            full_text="Hello\n\nWorld",
        )

        json_str = result.model_dump_json()
        restored = ExtractionResult.model_validate_json(json_str)
        assert restored.job_id == "abc-123"
        assert restored.total_pages == 3
        assert restored.status == ExtractionStatus.COMPLETED


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
config.py — Centralised settings loaded once from environment variables.

All configuration lives here. No other module reads os.environ directly.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Service ──────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    env: Literal["development", "production"] = "development"

    # ── File constraints ──────────────────────────────────────────────────────
    max_file_size_mb: int = 50
    allowed_extensions: str = "pdf,ppt,pptx"

    # ── Supabase ──────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_documents_bucket: str = "documents"

    # ── Google Cloud Vision ──────────────────────────────────────────────────
    google_application_credentials: str = ""
    google_cloud_vision_credentials_json: str = ""

    # ── Internal security ─────────────────────────────────────────────────────
    service_secret_token: str = ""

    # ── Derived (not from env) ────────────────────────────────────────────────
    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def allowed_ext_set(self) -> set[str]:
        return {ext.strip().lower() for ext in self.allowed_extensions.split(",")}

    @property
    def ocr_available(self) -> bool:
        return bool(
            self.google_application_credentials
            or self.google_cloud_vision_credentials_json
        )

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @field_validator("max_file_size_mb")
    @classmethod
    def _validate_size(cls, v: int) -> int:
        if not (1 <= v <= 500):
            raise ValueError("max_file_size_mb must be between 1 and 500")
        return v

    @model_validator(mode="after")
    def _warn_missing(self) -> "Settings":
        if not self.supabase_configured:
            import warnings
            warnings.warn(
                "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — "
                "extraction results will NOT be persisted.",
                stacklevel=2,
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

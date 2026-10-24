"""Validated settings. Secrets never belong in browser bundles or logs."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    gemini_api_key: SecretStr = SecretStr("")
    groq_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-3.8-flash"
    groq_model: str = "openai/gpt-oss-120b"
    primary_provider: Literal["auto", "gemini", "groq"] = "auto"
    gemini_embed_model: str = "gemini-embedding-001"
    gemini_embed_dim: int = Field(default=768, ge=128, le=3072)
    kb_dir: Path = ROOT / "knowledge"
    chroma_dir: Path = ROOT / "backend" / "chroma_db"
    demo_mode: bool = False
    retrieval_max_distance: float = Field(default=0.65, ge=0, le=2)
    request_timeout_seconds: int = Field(default=30, ge=1, le=120)
    rate_limit_per_minute: int = Field(default=12, ge=1)
    max_concurrent_requests: int = Field(default=4, ge=1, le=32)
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    def resolved_path(self, path: Path) -> Path:
        # Preserve the original backend-relative environment setting convention.
        return path.resolve() if path.is_absolute() else (ROOT / "backend" / path).resolve()


@lru_cache(maxsize=1)
def settings() -> Settings:
    return Settings()

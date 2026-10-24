import pytest

from backend.config import settings


@pytest.fixture(autouse=True)
def isolated_settings(monkeypatch, tmp_path):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setenv("CHROMA_DIR", str(tmp_path / "index"))
    monkeypatch.setenv("DEMO_MODE", "false")
    monkeypatch.setenv("PRIMARY_PROVIDER", "gemini")
    settings.cache_clear()
    yield
    settings.cache_clear()

import json

import pytest

from backend import ingest, kb, rag
from backend.config import settings


def test_real_chroma_index_activation_and_staleness(monkeypatch, tmp_path):
    # Actual on-disk Chroma, deterministic normalized vectors; no external API.
    monkeypatch.setenv("GEMINI_EMBED_DIM", "128")
    settings.cache_clear()
    monkeypatch.setattr(kb, "embed", lambda texts, task: [[1.0] + [0.0] * 127 for _ in texts])
    result = ingest.ingest()
    assert result["status"] == "indexed"
    assert rag._collection().count() == result["chunks"]
    assert ingest.ingest()["status"] == "unchanged"
    assert rag.retrieve("Aoun")
    manifest = ingest.manifest_path().read_text()
    monkeypatch.setattr(kb, "corpus_fingerprint", lambda _: "changed")
    with pytest.raises(RuntimeError, match="Knowledge changed"):
        rag._collection()

    def fail(*args):
        raise RuntimeError("embedding unavailable")

    monkeypatch.setattr(kb, "embed", fail)
    with pytest.raises(RuntimeError):
        ingest.ingest()
    assert ingest.manifest_path().read_text() == manifest
    assert json.loads(manifest)["collection"] == result["collection"]


def test_dry_run_does_not_create_database():
    assert ingest.ingest(dry_run=True)["status"] == "dry_run"
    assert not ingest.manifest_path().parent.exists()

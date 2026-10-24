import gzip
import json

import pytest

from backend import index_snapshot, ingest, kb, rag
from backend.config import settings


def test_shipped_snapshot_restores_real_chroma_without_provider(monkeypatch):
    def forbidden(*args):
        raise AssertionError("Snapshot restore must not call an embedding provider")
    monkeypatch.setattr(kb, "embed", forbidden)
    count = len(kb.build_chunks())
    assert index_snapshot.restore_snapshot()["chunks"] == count
    assert rag._collection().count() == count
    assert index_snapshot.restore_snapshot()["status"] == "unchanged"


def test_stale_snapshot_does_not_create_database(monkeypatch):
    monkeypatch.setattr(kb, "corpus_fingerprint", lambda _: "changed")
    with pytest.raises(ValueError, match="stale"):
        index_snapshot.restore_snapshot()
    assert not ingest.manifest_path().exists()


def test_snapshot_roundtrip_and_invalid_vector_rejected(monkeypatch, tmp_path):
    monkeypatch.setenv("GEMINI_EMBED_DIM", "128")
    settings.cache_clear()
    monkeypatch.setattr(kb, "embed", lambda texts, task: [[1.] + [0.] * 127 for _ in texts])
    ingest.ingest()
    path = tmp_path / "snapshot.gz"
    index_snapshot.export_snapshot(path)
    monkeypatch.setenv("CHROMA_DIR", str(tmp_path / "restored"))
    settings.cache_clear()
    assert index_snapshot.restore_snapshot(path)["status"] == "restored"
    active = ingest.manifest_path().read_text()
    payload = json.loads(gzip.decompress(path.read_bytes()))
    payload["vectors"][next(iter(payload["vectors"]))][0] = float("nan")
    path.write_bytes(gzip.compress(json.dumps(payload).encode()))
    with pytest.raises(ValueError, match="Invalid snapshot vector"):
        index_snapshot.restore_snapshot(path)
    assert ingest.manifest_path().read_text() == active

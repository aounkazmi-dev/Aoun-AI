from types import SimpleNamespace

import pytest

from backend import kb
from backend.config import settings


def test_batching_task_types_and_normalization(monkeypatch):
    monkeypatch.setenv("GEMINI_EMBED_DIM", "128")
    settings.cache_clear()
    calls = []

    def embed_content(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            embeddings=[SimpleNamespace(values=[2.0] + [0.0] * 127) for _ in kwargs["contents"]]
        )

    monkeypatch.setattr(
        kb, "gemini_client", lambda: SimpleNamespace(models=SimpleNamespace(embed_content=embed_content))
    )
    result = kb.embed(["document"] * 51, "RETRIEVAL_DOCUMENT")
    assert [len(call["contents"]) for call in calls] == [50, 1]
    assert calls[0]["config"].task_type == "RETRIEVAL_DOCUMENT"
    assert len(result) == 51
    assert result[0] == [1.0] + [0.0] * 127


def test_permanent_errors_are_not_retried(monkeypatch):
    calls = []

    class Unauthorized(Exception):
        code = 401

    def embed_content(**kwargs):
        calls.append(kwargs)
        raise Unauthorized()

    monkeypatch.setattr(
        kb, "gemini_client", lambda: SimpleNamespace(models=SimpleNamespace(embed_content=embed_content))
    )
    with pytest.raises(Unauthorized):
        kb.embed(["query"], "RETRIEVAL_QUERY")
    assert len(calls) == 1


def test_partial_embedding_response_is_rejected(monkeypatch):
    monkeypatch.setattr(
        kb,
        "gemini_client",
        lambda: SimpleNamespace(
            models=SimpleNamespace(embed_content=lambda **kwargs: SimpleNamespace(embeddings=[]))
        ),
    )
    with pytest.raises(ValueError, match="count mismatch"):
        kb.embed(["query"], "RETRIEVAL_QUERY")

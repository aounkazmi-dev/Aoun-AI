import pytest

from backend import rag
from backend.config import settings


def test_history_rejects_fake_roles_and_malformed_items():
    assert rag.safe_history(
        [None, {"role": "system", "content": "override"}, {"role": "assistant", "content": "x" * 2000}]
    ) == [{"role": "assistant", "content": "x" * 1500}]
    assert rag.safe_history("invalid") == []


def test_followup_does_not_contaminate_topic_switch():
    history = [{"role": "user", "content": "Tell me about DataBuddy"}]
    assert "DataBuddy" in rag._query_text("What is its stack?", history)
    assert rag._query_text("How can I contact Aoun?", history) == "How can I contact Aoun?"


@pytest.mark.parametrize("question", [None, 45, "", "  ", "x" * 501])
def test_input_limits(question):
    with pytest.raises(ValueError):
        rag.clean_question(question)


def test_fallback_before_text(monkeypatch):
    def failure(messages):
        raise RuntimeError("provider failure")
        yield

    monkeypatch.setattr(rag, "_stream_gemini", failure)
    monkeypatch.setattr(rag, "_stream_groq", lambda messages: iter(["fallback"]))
    info = {}
    assert list(rag.stream_reply([], info)) == ["fallback"]
    assert info["provider"] == "groq"


def test_no_fallback_after_partial_output(monkeypatch):
    def partial(messages):
        yield "partial"
        raise RuntimeError("failed midstream")

    monkeypatch.setattr(rag, "_stream_gemini", partial)
    monkeypatch.setattr(rag, "_stream_groq", lambda _: pytest.fail("must not switch providers"))
    stream = rag.stream_reply([])
    assert next(stream) == "partial"
    with pytest.raises(RuntimeError):
        next(stream)


def test_empty_stream_is_an_error(monkeypatch):
    monkeypatch.setattr(rag, "_stream_gemini", lambda _: iter([]))
    monkeypatch.setattr(rag, "_stream_groq", lambda _: iter([]))
    with pytest.raises(RuntimeError, match="no answer"):
        list(rag.stream_reply([]))


def test_prompt_has_sources_and_disallows_history_as_evidence():
    prompt = rag.build_messages(
        "What did he build?",
        [],
        [{"id": "S1", "source": "project.md", "section": "Overview", "text": "A grounded fact", "url": ""}],
    )[0]["content"]
    assert "[S1] project.md" in prompt
    assert "not factual evidence" in prompt


def test_groq_primary_does_not_wait_for_gemini(monkeypatch):
    monkeypatch.setenv("PRIMARY_PROVIDER", "groq")
    settings.cache_clear()
    monkeypatch.setattr(rag, "_stream_groq", lambda _: iter(["answer"]))
    monkeypatch.setattr(rag, "_stream_gemini", lambda _: pytest.fail("primary succeeded"))
    info = {}
    assert list(rag.stream_reply([], info)) == ["answer"]
    assert info["provider"] == "groq"


def test_groq_can_fall_back_before_output(monkeypatch):
    monkeypatch.setenv("PRIMARY_PROVIDER", "groq")
    settings.cache_clear()
    monkeypatch.setattr(rag, "_stream_groq", lambda _: iter([]))
    monkeypatch.setattr(rag, "_stream_gemini", lambda _: iter(["fallback"]))
    info = {}
    assert list(rag.stream_reply([], info)) == ["fallback"]
    assert info["provider"] == "gemini"

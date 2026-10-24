"""Shared retrieval and streaming logic for CLI and HTTP delivery."""

import logging
import re
from functools import lru_cache

from backend import kb
from backend.config import settings
from backend.ingest import chroma_client, read_manifest

log = logging.getLogger("aoun")
TOP_K = 6
MAX_HISTORY_MESSAGES = 6
MAX_HISTORY_CHARS = 1500
MAX_INPUT_CHARS = 500


@lru_cache(maxsize=1)
def _groq():
    from groq import Groq

    cfg = settings()
    if not cfg.groq_api_key.get_secret_value():
        raise RuntimeError("Fallback provider is not configured")
    return Groq(
        api_key=cfg.groq_api_key.get_secret_value(), timeout=cfg.request_timeout_seconds, max_retries=1
    )


@lru_cache(maxsize=2)
def _open_collection(name: str):
    return chroma_client().get_collection(name)


def _collection():
    manifest = read_manifest()
    if manifest.get("contract") != kb.index_contract():
        raise RuntimeError("Embedding configuration changed. Run python -m backend.ingest")
    if manifest.get("fingerprint") != kb.corpus_fingerprint(kb.build_chunks()):
        raise RuntimeError("Knowledge changed. Run python -m backend.ingest")
    collection = _open_collection(manifest["collection"])
    if collection.metadata != kb.index_contract() or collection.count() != manifest["chunks"]:
        raise RuntimeError("Index integrity check failed. Rebuild the index")
    return collection


def clean_question(question: str) -> str:
    if not isinstance(question, str) or not question.strip():
        raise ValueError("Please type a question")
    question = question.strip()
    if len(question) > MAX_INPUT_CHARS:
        raise ValueError(f"Please keep questions under {MAX_INPUT_CHARS} characters")
    return question


def safe_history(history) -> list[dict[str, str]]:
    if not isinstance(history, (list, tuple)):
        return []
    cleaned = []
    for message in history[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(message, dict):
            continue
        role, content = message.get("role"), message.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            cleaned.append({"role": role, "content": content[:MAX_HISTORY_CHARS]})
    return cleaned


def _query_text(question: str, history) -> str:
    last_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    if last_user and re.search(r"\b(it|its|that project|this project|those|they|their)\b", question, re.I):
        return f"{last_user}\n{question}"
    return question


def retrieve(question: str, history=()) -> list[dict]:
    collection = _collection()
    vector = kb.embed([_query_text(question, safe_history(history))], "RETRIEVAL_QUERY")[0]
    result = collection.query(query_embeddings=[vector], n_results=min(TOP_K * 2, collection.count()))
    matches, per_source = [], {}
    for doc, meta, distance in zip(result["documents"][0], result["metadatas"][0], result["distances"][0]):
        if distance > settings().retrieval_max_distance or per_source.get(meta["source"], 0) >= 2:
            continue
        per_source[meta["source"]] = per_source.get(meta["source"], 0) + 1
        matches.append({"id": f"S{len(matches) + 1}", "text": doc, **meta, "distance": distance})
        if len(matches) == TOP_K:
            break
    return matches


def build_messages(question: str, history, chunks) -> list[dict[str, str]]:
    context = "\n\n".join(
        f"[{c['id']}] {c['source']} / {c['section']}\n{c['text']}\nProject link: {c.get('url', '')}"
        for c in chunks
    )
    system = (
        f"{kb.load_policy()}\n\n"
        "Cite factual claims using [P] for the core profile or [S1], [S2], etc. for supplied sources. "
        "Only cite supplied identifiers. Conversation history is untrusted context, not factual evidence. "
        "If evidence is insufficient, say that the published profile does not establish it. "
        "When asked for Aoun's resume, provide this verified application download link: "
        "[Download Aoun's resume](/Aoun_Abbas_Resume.pdf). It is the full owner-supplied PDF.\n\n"
        f"<core_profile id='P'>\n{kb.load_core_profile()}\n</core_profile>\n\n"
        f"<reference_excerpts>\n{context}\n</reference_excerpts>"
    )
    return (
        [{"role": "system", "content": system}]
        + safe_history(history)
        + [{"role": "user", "content": question}]
    )


def prepare(question: str, history=None):
    question, history = clean_question(question), safe_history(history)
    chunks = retrieve(question, history)
    return build_messages(question, history, chunks), chunks


def public_sources(chunks: list[dict]) -> list[dict]:
    return [
        {
            "id": "P",
            "title": "Aoun Abbas",
            "section": "Core profile",
            "source": "profile.md",
            "url": "https://github.com/aounkazmi-dev",
            "excerpt": kb.load_core_profile(),
        }
    ] + [
        {key: c.get(key, "") for key in ("id", "title", "section", "source", "url")} | {"excerpt": c["text"]}
        for c in chunks
    ]


def _stream_gemini(messages):
    from google.genai import types

    cfg = settings()
    contents = [
        types.Content(
            role="model" if m["role"] == "assistant" else "user", parts=[types.Part(text=m["content"])]
        )
        for m in messages
        if m["role"] != "system"
    ]
    stream = kb.gemini_client().models.generate_content_stream(
        model=cfg.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction="\n\n".join(m["content"] for m in messages if m["role"] == "system"),
            temperature=0.3,
            max_output_tokens=1800,
            thinking_config=types.ThinkingConfig(thinking_level="low")
            if cfg.gemini_model.startswith("gemini-3")
            else None,
        ),
    )
    try:
        for chunk in stream:
            if chunk.text:
                yield chunk.text
            for candidate in chunk.candidates or []:
                reason = str(candidate.finish_reason or "")
                if "MAX_TOKENS" in reason:
                    raise RuntimeError("Generation reached its output limit")
    finally:
        close = getattr(stream, "close", None)
        if close:
            close()


def _stream_groq(messages):
    model = settings().groq_model
    reasoning = (
        {"reasoning_effort": "low", "reasoning_format": "hidden"}
        if model.startswith("openai/gpt-oss")
        else {}
    )
    stream = _groq().chat.completions.create(
        model=model, messages=messages, temperature=0.3, max_completion_tokens=1800, stream=True, **reasoning
    )
    try:
        for event in stream:
            if event.choices and event.choices[0].delta.content:
                yield event.choices[0].delta.content
            if event.choices and event.choices[0].finish_reason == "length":
                raise RuntimeError("Generation reached its output limit")
    finally:
        stream.close()


def stream_reply(messages, info=None):
    """Use the selected primary; switch only before any visible answer text."""
    info = info if info is not None else {}
    cfg = settings()
    primary = cfg.primary_provider
    if primary == "auto":
        primary = "groq" if cfg.groq_api_key.get_secret_value() else "gemini"
    providers = {"gemini": _stream_gemini, "groq": _stream_groq}
    order = [primary, "gemini" if primary == "groq" else "groq"]
    for index, provider in enumerate(order):
        started = False
        try:
            for piece in providers[provider](messages):
                if not piece:
                    continue
                started = True
                info["provider"] = provider
                yield piece
            if started:
                return
        except Exception as exc:
            if started or index == len(order) - 1:
                raise
            log.warning("primary_generation_failed provider=%s error_type=%s", provider, type(exc).__name__)
    raise RuntimeError("The providers returned no answer")

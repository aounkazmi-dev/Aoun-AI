"""Public Markdown ingestion and normalized Gemini embeddings."""

import hashlib
import json
import math
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from backend.config import settings

COLLECTION = "aoun_kb"
CHUNK_VERSION = "2"
NOT_INDEXED = {"README.md", "knowledge-policy.md", "TODO.md"}
MAX_CHUNK_CHARS = 1800


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str
    source: str
    title: str
    section: str
    category: str
    status: str
    url: str

    def metadata(self) -> dict:
        return {
            key: getattr(self, key) for key in ("source", "title", "section", "category", "status", "url")
        }


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Supports flat string metadata, not full YAML."""
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n?", text, flags=re.S)
    if not match:
        return {}, text
    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip("\"'")
    return meta, text[match.end() :]


def clean_body(body: str) -> str:
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    body = re.sub(r"(?im)^.*\b(?:phone|mobile|home address)\s*:[^\n]*", "", body)
    return body.strip()


def load_markdown_body(name: str, *, public_only: bool = True) -> str:
    path = settings().resolved_path(settings().kb_dir) / name
    meta, body = split_frontmatter(read_text(path))
    if public_only and meta.get("visibility") != "public":
        raise ValueError(f"Knowledge file is not explicitly public: {name}")
    return clean_body(body)


def load_policy() -> str:
    return load_markdown_body("knowledge-policy.md", public_only=False)


def load_core_profile() -> str:
    return load_markdown_body("profile.md")


def split_sections(body: str) -> tuple[str, list[tuple[str, str]]]:
    title, name, buf, sections = "Untitled", "Overview", [], []
    for line in body.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            sections.append((name, "\n".join(buf).strip()))
            name, buf = line[3:].strip(), []
        else:
            buf.append(line)
    sections.append((name, "\n".join(buf).strip()))
    return title, [(name, text) for name, text in sections if text]


def split_long(text: str, limit: int) -> list[str]:
    """Prefer paragraph/word boundaries, but enforce a hard character cap."""
    if limit < 1:
        raise ValueError("Chunk limit must be positive")
    parts = []
    while len(text) > limit:
        end = text.rfind("\n\n", 0, limit + 1)
        if end < limit // 2:
            end = text.rfind(" ", 0, limit + 1)
        if end < limit // 2:
            end = limit
        parts.append(text[:end].strip())
        text = text[end:].strip()
    if text.strip():
        parts.append(text.strip())
    return parts


def build_chunks(kb_dir: Path | None = None) -> list[Chunk]:
    directory = kb_dir or settings().resolved_path(settings().kb_dir)
    chunks, seen = [], set()
    for path in sorted(directory.rglob("*.md")):
        if path.name in NOT_INDEXED or path.is_symlink():
            continue
        meta, body = split_frontmatter(read_text(path))
        if meta.get("visibility") != "public":
            continue
        body = clean_body(body)
        rel = path.relative_to(directory).as_posix()
        title, sections = split_sections(body)
        link = re.search(r"https://github\.com/[\w.-]+/[\w.-]+", body)
        url = link.group(0) if link else ""
        for section, text in sections:
            prefix = f"{title} — {section}\n\n"
            if len(prefix) >= MAX_CHUNK_CHARS:
                raise ValueError(f"Heading too long: {rel}")
            for part, piece in enumerate(split_long(text, MAX_CHUNK_CHARS - len(prefix))):
                identity = hashlib.sha256(f"{rel}\0{section}\0{part}\0{piece}".encode()).hexdigest()
                if identity in seen:
                    continue
                seen.add(identity)
                chunks.append(
                    Chunk(
                        identity,
                        prefix + piece,
                        rel,
                        title,
                        section,
                        meta.get("category", ""),
                        meta.get("status", ""),
                        url,
                    )
                )
    return chunks


def corpus_fingerprint(chunks: list[Chunk]) -> str:
    payload = [(c.id, c.metadata()) for c in chunks]
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def index_contract() -> dict:
    cfg = settings()
    return {
        "embedding_model": cfg.gemini_embed_model,
        "dimensions": cfg.gemini_embed_dim,
        "normalization": "l2",
        "chunk_version": CHUNK_VERSION,
        "hnsw:space": "cosine",
    }


def normalize(vector, dimensions: int) -> list[float]:
    if len(vector) != dimensions or not all(math.isfinite(v) for v in vector):
        raise ValueError("Embedding dimensions or values are invalid")
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0:
        raise ValueError("Embedding has zero magnitude")
    return [v / norm for v in vector]


@lru_cache(maxsize=1)
def gemini_client():
    from google import genai
    from google.genai import types

    cfg = settings()
    if not cfg.gemini_api_key.get_secret_value():
        raise RuntimeError("Set GEMINI_API_KEY in the server environment")
    return genai.Client(
        api_key=cfg.gemini_api_key.get_secret_value(),
        http_options=types.HttpOptions(timeout=cfg.request_timeout_seconds * 1000),
    )


def embed(texts: list[str], task_type: str) -> list[list[float]]:
    from google.genai import types

    if task_type not in {"RETRIEVAL_QUERY", "RETRIEVAL_DOCUMENT"}:
        raise ValueError("Unsupported embedding task")
    if not texts:
        return []
    cfg, client, vectors = settings(), gemini_client(), []
    for offset in range(0, len(texts), 50):
        batch = texts[offset : offset + 50]
        for attempt in range(4):
            try:
                result = client.models.embed_content(
                    model=cfg.gemini_embed_model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=cfg.gemini_embed_dim
                    ),
                )
                if not result.embeddings or len(result.embeddings) != len(batch):
                    raise ValueError("Embedding response count mismatch")
                vectors.extend(normalize(e.values, cfg.gemini_embed_dim) for e in result.embeddings)
                break
            except Exception as exc:
                if getattr(exc, "code", None) not in {429, 500, 502, 503, 504} or attempt == 3:
                    raise
                time.sleep(2**attempt)
    return vectors

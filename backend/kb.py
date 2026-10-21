"""Shared helpers: where the knowledge base lives, how to read and chunk it,
and how to turn text into embeddings.

Only the standard library is needed to import this file. Gemini is imported
lazily inside embed(), so the chunking can be tested without any API keys.
"""
import os
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass

ROOT = Path(__file__).resolve().parent


def _path_setting(name: str, default: Path) -> Path:
    """Read a folder from .env. Relative paths count from this backend folder
    (not from wherever you happened to run the command); empty values use the default."""
    path = Path(os.getenv(name) or default)
    return (path if path.is_absolute() else ROOT / path).resolve()


KB_DIR = _path_setting("KB_DIR", ROOT.parent / "knowledge")
DB_DIR = _path_setting("CHROMA_DIR", ROOT / "chroma_db")
COLLECTION = "aoun_kb"

# Model names change often. Check the Embeddings page in the Gemini docs and override in .env.
# If you change the embedding model or dimension, re-run ingest.py (old vectors won't match).
EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("GEMINI_EMBED_DIM", "768"))

# Files that exist in the KB folder but must never become searchable chunks.
NOT_INDEXED = {"README.md", "knowledge-policy.md", "TODO.md"}
MAX_CHUNK_CHARS = 1800
MIN_CHUNK_CHARS = 40


@dataclass
class Chunk:
    id: str
    text: str
    source: str
    title: str
    section: str
    category: str


# ---------- reading markdown ----------

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")  # -sig handles a Windows BOM


def split_frontmatter(text: str):
    """Return (metadata dict, body) for a file that may start with --- ... ---."""
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n?", text, flags=re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip("\"'")
    return meta, text[m.end():]


def clean_body(body: str) -> str:
    """Drop HTML comments (drafts / TODOs) so they never reach the index."""
    return re.sub(r"<!--.*?-->", "", body, flags=re.S).strip()


def load_markdown_body(name: str) -> str:
    _, body = split_frontmatter(read_text(KB_DIR / name))
    return clean_body(body)


@lru_cache(maxsize=1)
def load_policy() -> str:
    return load_markdown_body("knowledge-policy.md")


@lru_cache(maxsize=1)
def load_core_profile() -> str:
    return load_markdown_body("profile.md")


# ---------- chunking ----------

def split_sections(body: str):
    """Split on '## ' headings. Returns (title from the '# ' line, [(section, text)])."""
    title = "Untitled"
    sections, name, buf = [], "Overview", []
    for line in body.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            sections.append((name, "\n".join(buf).strip()))
            name, buf = line[3:].strip(), []
        else:
            buf.append(line)
    sections.append((name, "\n".join(buf).strip()))
    return title, [(n, t) for n, t in sections if t]


def split_long(text: str, limit: int):
    """Break an oversized section at paragraph boundaries."""
    if len(text) <= limit:
        return [text]
    parts, cur = [], ""
    for para in re.split(r"\n\s*\n", text):
        if cur and len(cur) + len(para) + 2 > limit:
            parts.append(cur)
            cur = para
        else:
            cur = f"{cur}\n\n{para}" if cur else para
    if cur:
        parts.append(cur)
    return parts


def build_chunks(kb_dir: Path = None):
    kb_dir = kb_dir or KB_DIR
    chunks = []
    for path in sorted(kb_dir.rglob("*.md")):
        if path.name in NOT_INDEXED:
            continue
        meta, body = split_frontmatter(read_text(path))
        if meta.get("visibility", "public") != "public":
            continue
        rel = path.relative_to(kb_dir).as_posix()
        title, sections = split_sections(clean_body(body))
        for section, text in sections:
            for i, piece in enumerate(split_long(text, MAX_CHUNK_CHARS)):
                if len(piece) < MIN_CHUNK_CHARS:
                    continue
                label = section if i == 0 else f"{section} (part {i + 1})"
                chunks.append(
                    Chunk(
                        id=f"{rel}#{len(chunks)}",
                        # The header line keeps every chunk self-explanatory.
                        text=f"{title} \u2014 {label}\n\n{piece}",
                        source=rel,
                        title=title,
                        section=label,
                        category=meta.get("category", ""),
                    )
                )
    return chunks


# ---------- embeddings ----------

@lru_cache(maxsize=1)
def gemini_client():
    from google import genai

    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is missing. Copy env.example to .env and fill it in.")
    return genai.Client(api_key=key)


def embed(texts, task_type: str):
    """task_type: RETRIEVAL_DOCUMENT when indexing, RETRIEVAL_QUERY for questions."""
    from google.genai import types

    client, vectors = gemini_client(), []
    for i in range(0, len(texts), 50):
        batch = texts[i:i + 50]
        for attempt in range(4):
            try:
                res = client.models.embed_content(
                    model=EMBED_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=EMBED_DIM
                    ),
                )
                vectors.extend(e.values for e in res.embeddings)
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 * 2 ** attempt)  # simple backoff for free-tier rate limits
    return vectors

"""Build an index in isolation, then atomically activate it. Old indexes are retained."""

import argparse
import json
import os
import uuid
from pathlib import Path

from backend import kb
from backend.config import settings


def manifest_path() -> Path:
    return settings().resolved_path(settings().chroma_dir) / "active-index.json"


def read_manifest() -> dict:
    try:
        return json.loads(manifest_path().read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise RuntimeError("Index is missing. Run python -m backend.ingest") from exc


def chroma_client():
    import chromadb
    from chromadb.config import Settings as ChromaSettings

    return chromadb.PersistentClient(
        path=str(settings().resolved_path(settings().chroma_dir)),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def ingest(*, dry_run: bool = False) -> dict:
    chunks = kb.build_chunks()
    if not chunks:
        raise ValueError("No explicitly public knowledge documents found")
    fingerprint, contract = kb.corpus_fingerprint(chunks), kb.index_contract()
    summary = {
        "chunks": len(chunks),
        "documents": len({c.source for c in chunks}),
        "fingerprint": fingerprint,
        "contract": contract,
    }
    if dry_run:
        return {**summary, "status": "dry_run"}
    path = manifest_path()
    if path.exists():
        old = read_manifest()
        if old.get("fingerprint") == fingerprint and old.get("contract") == contract:
            collection = chroma_client().get_collection(old["collection"])
            if collection.count() == len(chunks) and collection.metadata == contract:
                return {**old, "status": "unchanged"}
    vectors = kb.embed([c.text for c in chunks], "RETRIEVAL_DOCUMENT")
    client = chroma_client()
    name = f"{kb.COLLECTION}_{uuid.uuid4().hex[:12]}"
    collection = client.create_collection(name, metadata=contract)
    collection.add(
        ids=[c.id for c in chunks],
        documents=[c.text for c in chunks],
        metadatas=[c.metadata() for c in chunks],
        embeddings=vectors,
    )
    if collection.count() != len(chunks):
        raise RuntimeError("Incomplete index; previous index remains active")
    manifest = {**summary, "collection": name}
    temporary = path.with_name(f"active-index.{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.replace(temporary, path)
    return {**manifest, "status": "indexed"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(ingest(dry_run=args.dry_run), indent=2))
    except Exception as exc:
        # Provider exception strings can include request data; expose only safe diagnostic fields.
        code = getattr(exc, "code", None)
        print(
            f"Ingestion failed ({type(exc).__name__}, status={code if isinstance(code, int) else 'unknown'})."
        )
        print(
            "Check the server configuration, provider access, and public knowledge files. The active index was not replaced."
        )
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()

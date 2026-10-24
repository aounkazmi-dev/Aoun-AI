"""Portable public embedding snapshot for reproducible, API-free cold starts.

Export after ingestion when publishing knowledge changes. Only explicitly public
chunks are included. Restore verifies source and embedding compatibility first.
"""

import argparse
import gzip
import json
import math
import os
import uuid
from pathlib import Path

from backend import ingest, kb
from backend.config import ROOT

DEFAULT = ROOT / "deployment" / "public-index.json.gz"


def export_snapshot(path: Path = DEFAULT):
    chunks = kb.build_chunks()
    manifest = ingest.read_manifest()
    if manifest["fingerprint"] != kb.corpus_fingerprint(chunks) or manifest["contract"] != kb.index_contract():
        raise ValueError("Ingest the current knowledge and embedding configuration before exporting")
    collection = ingest.chroma_client().get_collection(manifest["collection"])
    data = collection.get(ids=[c.id for c in chunks], include=["embeddings"])
    vectors = {key: vector.tolist() for key, vector in zip(data["ids"], data["embeddings"])}
    payload = {
        "version": 1,
        "fingerprint": manifest["fingerprint"],
        "contract": manifest["contract"],
        "vectors": {c.id: vectors[c.id] for c in chunks},
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(gzip.compress(json.dumps(payload, separators=(",", ":")).encode(), mtime=0))
    return {"status": "exported", "chunks": len(chunks)}


def restore_snapshot(path: Path = DEFAULT):
    payload = json.loads(gzip.decompress(path.read_bytes()))
    chunks = kb.build_chunks()
    fingerprint, contract = kb.corpus_fingerprint(chunks), kb.index_contract()
    if payload.get("version") != 1 or payload["fingerprint"] != fingerprint or payload["contract"] != contract:
        raise ValueError("Snapshot is stale or incompatible. Ingest and export before deploying.")
    vectors = payload["vectors"]
    if set(vectors) != {c.id for c in chunks}:
        raise ValueError("Snapshot chunk IDs do not match public knowledge")
    from backend.config import settings

    for vector in vectors.values():
        if len(vector) != settings().gemini_embed_dim or not all(math.isfinite(v) for v in vector):
            raise ValueError("Invalid snapshot vector")
        if not math.isclose(sum(v * v for v in vector), 1, abs_tol=0.001):
            raise ValueError("Snapshot vectors must be normalized")
    client = ingest.chroma_client()
    try:
        old = ingest.read_manifest()
        if old["fingerprint"] == fingerprint and old["contract"] == contract:
            active = client.get_collection(old["collection"])
            if active.count() == len(chunks) and active.metadata == contract:
                return {"status": "unchanged", "chunks": len(chunks)}
    except (RuntimeError, KeyError):
        pass
    name = f"{kb.COLLECTION}_{uuid.uuid4().hex[:12]}"
    collection = client.create_collection(name, metadata=contract)
    collection.add(ids=[c.id for c in chunks], documents=[c.text for c in chunks],
                   metadatas=[c.metadata() for c in chunks], embeddings=[vectors[c.id] for c in chunks])
    if collection.count() != len(chunks):
        raise RuntimeError("Incomplete snapshot import; active index unchanged")
    manifest = {"fingerprint": fingerprint, "contract": contract, "collection": name,
                "chunks": len(chunks), "documents": len({c.source for c in chunks})}
    target = ingest.manifest_path()
    temporary = target.with_name(f"active-index.{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.replace(temporary, target)
    return {"status": "restored", "chunks": len(chunks)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["export", "restore"])
    parser.add_argument("--path", type=Path, default=DEFAULT)
    args = parser.parse_args()
    print(json.dumps((export_snapshot if args.action == "export" else restore_snapshot)(args.path)))

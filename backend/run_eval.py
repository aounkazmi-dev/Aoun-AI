"""Evaluate lexical baseline, semantic retrieval, or live answers.

Default is offline lexical retrieval. Semantic/answers modes make paid API calls.
Term and citation checks are diagnostics, not proof of factual groundedness.
"""

import argparse
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from backend import demo, kb, rag
from backend.config import ROOT, settings


def evaluate(mode: str, checkpoint: Path | None = None, case_ids: list[str] | None = None) -> dict:
    cases = json.loads((ROOT / "evaluation" / "cases.json").read_text(encoding="utf-8"))
    if case_ids:
        unknown = set(case_ids) - {case["id"] for case in cases}
        if unknown:
            raise ValueError(f"Unknown evaluation IDs: {sorted(unknown)}")
        cases = [case for case in cases if case["id"] in case_ids]
    rows = []
    consecutive_errors = 0
    for case in cases:
        started = time.perf_counter()
        row = {"id": case["id"], "question": case["question"], "expected_sources": case["expected_sources"]}
        try:
            history = case.get("history", [])
            if mode == "lexical":
                chunks = demo.retrieve(case["question"], history)
            else:
                chunks = rag.retrieve(case["question"], history)
            sources = list(dict.fromkeys(c["source"] for c in chunks))
            row["retrieval_ms"] = round((time.perf_counter() - started) * 1000)
            expected = set(case["expected_sources"])
            rank = next((i + 1 for i, source in enumerate(sources) if source in expected), None)
            row.update(
                {
                    "retrieved_sources": sources,
                    "hit": bool(rank) if expected else None,
                    "reciprocal_rank": 1 / rank if rank else 0,
                    "recall": len(expected.intersection(sources)) / len(expected) if expected else None,
                }
            )
            if mode == "answers":
                messages = rag.build_messages(case["question"], history, chunks)
                info = {}
                pieces = []
                for piece in rag.stream_reply(messages, info):
                    if not pieces:
                        row["first_token_ms"] = round((time.perf_counter() - started) * 1000)
                    pieces.append(piece)
                answer = "".join(pieces)
                citations = set(re.findall(r"[\[【](P|S\d+)[\]】]", answer))
                valid_ids = {"P"} | {c["id"] for c in chunks}
                row.update(
                    {
                        "answer": answer,
                        "provider": info.get("provider"),
                        "model": settings().groq_model
                        if info.get("provider") == "groq"
                        else settings().gemini_model,
                        "required_term_match": any(
                            term.lower() in answer.lower() for term in case.get("required_any", [])
                        ),
                        "citation_ids_valid": citations.issubset(valid_ids),
                        "has_citation": bool(citations),
                        "manual_review": case.get(
                            "manual_review", "Check every factual claim against sources."
                        ),
                    }
                )
        except Exception as exc:
            row["error_type"] = type(exc).__name__
            code = getattr(exc, "code", None)
            if isinstance(code, int):
                row["error_code"] = code
        row["elapsed_ms"] = round((time.perf_counter() - started) * 1000)
        rows.append(row)
        consecutive_errors = consecutive_errors + 1 if "error_type" in row else 0
        if checkpoint:
            checkpoint.write_text(
                json.dumps({"status": "running", "mode": mode, "cases": rows}, indent=2), encoding="utf-8"
            )
        print(f"[{len(rows)}/{len(cases)}] {case['id']}: {row.get('error_type', 'ok')}", flush=True)
        if consecutive_errors >= 3:
            print("Stopping after three consecutive provider failures.", flush=True)
            break
    retrieval = [row for row in rows if row["expected_sources"]]
    successful = [row for row in retrieval if "error_type" not in row]
    count = len(retrieval)
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "corpus_fingerprint": kb.corpus_fingerprint(kb.build_chunks()),
        "embedding_contract": kb.index_contract() if mode != "lexical" else None,
        "generation_config": {
            "primary": settings().primary_provider,
            "gemini": settings().gemini_model,
            "groq": settings().groq_model,
        }
        if mode == "answers"
        else None,
        "policy_fingerprint": hashlib.sha256(kb.load_policy().encode()).hexdigest(),
        "summary": {
            "cases": len(rows),
            "retrieval_cases": count,
            "errors": sum("error_type" in row for row in rows),
            "planned_cases": len(cases),
            "hit_rate": sum(bool(row.get("hit")) for row in retrieval) / max(1, count),
            "mean_reciprocal_rank": sum(row.get("reciprocal_rank", 0) for row in retrieval) / max(1, count),
            "mean_source_recall": sum(row.get("recall", 0) or 0 for row in retrieval) / max(1, count),
            "mean_retrieval_ms": sum(row["retrieval_ms"] for row in successful) / max(1, len(successful)),
        },
        "limitations": "Small hand-authored dataset. Lexical scores are NOT semantic/LLM quality. Answer term/citation checks require human review. Expected-source cases may have multiple valid alternatives.",
        "cases": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["lexical", "semantic", "answers"], default="lexical")
    parser.add_argument("--output", type=Path, default=ROOT / "evaluation" / "results.json")
    parser.add_argument("--cases", nargs="+", help="Optional case IDs for a focused paid regression run")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report = evaluate(args.mode, checkpoint=args.output, case_ids=args.cases)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    print(f"Saved {args.output}. {report['limitations']}")
    raise SystemExit(1 if report["summary"]["errors"] else 0)


if __name__ == "__main__":
    main()

"""Run every question in eval_questions.txt and save answers + sources to
eval_output.md so you can read through them and spot bad answers.

    python run_eval.py
"""
import time
from pathlib import Path

import rag

HERE = Path(__file__).resolve().parent


def main():
    questions = [q.strip() for q in (HERE / "eval_questions.txt").read_text(encoding="utf-8").splitlines() if q.strip()]
    lines = ["# Eval run\n"]
    for i, q in enumerate(questions, 1):
        print(f"[{i}/{len(questions)}] {q}")
        answer, sources, info = "", "", {}
        for attempt in range(3):
            try:
                messages, chunks = rag.prepare(q)
                info = {}
                answer = "".join(rag.stream_reply(messages, info))
                sources = ", ".join(sorted({f"{c['source']} > {c['section']}" for c in chunks}))
                break
            except Exception as e:  # keep going so one failure doesn't lose the run
                answer = f"ERROR: {e}"
                if attempt < 2:
                    print("  hit an error (likely a free-tier rate limit), waiting 30s...")
                    time.sleep(30)
        lines += [f"## {i}. {q}\n", answer.strip() + "\n", f"_Sources: {sources} | Answered by: {info.get('provider', '?')}_\n"]
        time.sleep(2)  # stay under free-tier rate limits
    out = HERE / "eval_output.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()

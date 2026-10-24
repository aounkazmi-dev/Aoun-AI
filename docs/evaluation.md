# AI quality evaluation

The dataset contains 20 hand-authored cases: identity, education, projects, skills/experience, contact, follow-ups, topic changes, unknown facts, privacy, prompt injection, and unrelated requests.

## Three distinct modes

- `lexical`: offline word-overlap baseline over the same chunked corpus. No embeddings or LLM calls. Useful for dataset and ingestion smoke checks, not evidence of semantic quality.
- `semantic`: real Gemini query embeddings and Chroma retrieval. Requires ingestion and a key.
- `answers`: semantic retrieval plus live streamed generation. Adds answer text, provider, rough required-term checks, and citation identifier checks for manual review.

Reports contain corpus fingerprints and configuration so comparisons can be attributed to a specific data/model setup. Generated reports are ignored by Git because they can contain model output.

## Metrics

Hit rate measures whether any expected document appears. Mean reciprocal rank scores how early the first expected document appears in the deduplicated document ranking. Source recall measures coverage of the expected-document list. Cases with no expected sources are excluded from retrieval aggregates and reviewed for behavior instead. Failures count against retrieval aggregates rather than disappearing from scores.

Expected document sets sometimes contain acceptable alternatives; source recall then measures coverage rather than a strict correctness requirement. Required-term checks are weak diagnostics: a wrong answer can contain the right word. Valid citation IDs prove only that a citation exists in the supplied set, not that it supports a claim.

The distance threshold starts at 0.65 as an explicitly uncalibrated configuration. Compare thresholds on development cases, reserve additional held-out questions, and inspect failure patterns before publishing quality claims.

## Live observations (October 24, 2026)

The public corpus was ingested with Gemini embedding-001 (768 normalized dimensions): 16 documents and 78 chunks. An initial 20-case live run retrieved an expected document for all 15 source-labelled cases (MRR 0.967, source recall 1.000). This measures retrieval on this small development set, not answer accuracy.

Gemini generation frequently timed out in this environment. Auto selection therefore prefers Groq when configured, with Gemini as a pre-output fallback. Focused comparisons motivated selecting `openai/gpt-oss-120b`; this is an empirical local choice, not a general model ranking. Provider availability and account quotas remain external dependencies.

Manual review found unsupported or over-specific claims even when relevant sources were retrieved. Examples include an earlier claim that the laptop predictor was deployed and wording that attributes PDF assembly to AskOne's LLM rather than its report-generation code. Some answers also use inconsistent citation spacing or Unicode brackets. Prompt tightening improved some focused cases but did not establish reliable claim-level grounding. The next quality milestone is held-out evaluation with explicit claim-support annotations; adding more frameworks would not address this evidence gap.

See `verification.md` for the final selected-configuration run, failures, and browser smoke result. Generated answer reports remain local in ignored `evaluation/results*.json` files.

## Manual rubric for live answers

For each case, record supported/unsupported claims, correct project status, invented experience, inappropriate disclosure, successful abstention, citation support, and usefulness. Include adversarial follow-ups and attempts to inject fake assistant history. Report sample size and model/configuration with any results. Never present offline preview or synthetic provider tests as live AI benchmarks.

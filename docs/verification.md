# Verification record

Local verification performed on Windows with Python 3.13 and Node 22.

Deployment preparation: 35 backend tests, 6 frontend unit tests, the production build, and 12 browser tests passed. The additional browser cases exercise navigation, resume access, chat, and sources at 320, 360, 430, 768, and 1024 pixels with no horizontal overflow. The public snapshot restored 78 chunks into a fresh Chroma database without provider calls; stale and invalid snapshots were rejected. These are local checks; hosted results are recorded separately after deployment.

Hosted frontend: Vercel deployment `dpl_4njYCjZKHemk2XaozYAyrAu937vf` reached READY for commit `1999413`. A Chrome check against `https://aoun-abbas-ai.vercel.app` returned HTTP 200, downloaded `Aoun_Abbas_Resume.pdf`, and detected no horizontal overflow or page runtime errors at 390 × 844. GitHub Actions run `40084226529` passed on Linux. Render provisioning and live hosted chat are still pending.

- Python checks: 32 tests passed in the final suite, including actual temporary Chroma persistence with deterministic fake embeddings, ingestion activation, stale-index detection, embedding batching/normalization, privacy filtering, stream failure behavior, provider ordering, API contracts, limits, and unavailable configuration.
- Frontend transport/storage unit tests: 6 passed.
- Production TypeScript/Vite build: passed.
- Ingestion dry run: 16 public documents, 78 chunks; no external API calls.
- Offline lexical evaluation: 20 cases, 15 with expected retrieval sources; hit rate 14/15 (93.3%), mean reciprocal rank 0.789, mean source recall 0.900. This is a lexical baseline, not a Gemini retrieval or answer-quality score.

Browser verification: all 6 tests passed. Coverage includes streamed chat, sources, reload persistence, export/delete, stop/retry, mobile layout/navigation, light/dark views, and recoverable network errors. The automated accessibility pass found no serious/critical violations on the tested home and projects views. Screenshots are in `docs/screenshots`.

## Live verification — October 24, 2026

With explicit approval, indexed 16 public Markdown documents / 78 chunks using Google Gemini `gemini-embedding-001`, 768 normalized dimensions, persisted in Chroma. Phone data was excluded. Credentials and the local database remain ignored by Git.

The final 20-case answer evaluation used auto provider selection (Groq `openai/gpt-oss-120b` primary, Gemini `gemini-3.8-flash` fallback). Nineteen answers completed via Groq. One failed: Groq rate limiting followed by a Gemini read timeout. The evaluator returned a failing exit status, correctly preserving that failure. Retrieval itself found an expected document in all 15 labelled cases: hit rate 1.000, MRR 0.967, source recall 1.000. These are development-set retrieval measurements, not 100% answer accuracy. Local details are in ignored `evaluation/results-final-live.json`.

Manual review confirmed correct planned-project status, no invented formal employment, and appropriate behavior on the five tested privacy/injection/off-topic/unknown/system-prompt cases. It also found remaining over-specific wording in project explanations, including attributing PDF assembly to an LLM. Grounding and citation support remain open quality work; see `evaluation.md`.

A real Chrome smoke test completed a live streamed question about ScamShield PK in approximately 9.5 seconds, preserved its planned status, opened and closed the source drawer, and reported no browser runtime errors. Screenshot: `screenshots/live-chat.png`. The temporary browser and server were stopped after verification.

Docker is not installed in the local environment, so the supplied image/Compose setup has not been built here. No public deployment, uptime, production-readiness, or general answer-accuracy claim is made.

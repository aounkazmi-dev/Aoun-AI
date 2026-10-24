# Architecture and engineering decisions

## A deliberately small core

`config.py` validates settings and keeps keys as secret values. `kb.py` reads public Markdown, creates stable content IDs, and embeds text. `ingest.py` owns database writes. `rag.py` owns retrieval and generation. `api.py` and `chat_cli.py` are delivery adapters. `demo.py` is explicitly separate from live AI.

Direct provider SDKs make this single retrieval/generation flow easy to explain and test. LangChain/LangGraph are not required for a linear pipeline. Introduce orchestration only for genuine tools, branching, or resumable work.

## Index lifecycle

Files must explicitly opt in with `visibility: public`. Markdown is split by `##` headings, then paragraph/word boundaries with a hard 1,800-character limit including the title. Short facts are retained. HTML comments and named private contact fields are removed. Metadata is deliberately flat, not a full YAML parser.

IDs hash source, section, part position, and content. Unrelated files cannot shift IDs. Corpus fingerprints also cover metadata. Gemini embeddings use retrieval-document/query tasks and L2 normalization. Model, dimensions, normalization, chunking version, and cosine metric form the index contract.

Ingestion embeds into a new collection, verifies the count, then atomically replaces the active manifest. Failed ingestion leaves the previous manifest intact. Repeated unchanged ingestion skips API work. Deleted files disappear from the new active collection. Old collections are retained, so administrators should remove obsolete data after validation, especially following a privacy correction. There is no automatic concurrent ingestion coordination; run one writer.

Queries reject stale or incompatible indexes before paying for query embeddings. A changed source requires re-ingestion. The check hashes this tiny corpus on each request; larger corpora should use a build manifest rather than scan at request time.

## Retrieval and prompting

The query uses the prior user message only for explicit anaphora such as “its stack.” Retrieve up to 12 candidates, filter by a configurable cosine-distance cutoff, and retain up to 6 with at most 2 from each document. This is a transparent baseline, not a tuned ranker. Distances are not confidence probabilities.

The prompt includes a concise policy, the public core profile, source-tagged excerpts, and at most six history messages of 1,500 characters each. History is never factual evidence. The model is instructed to cite `[P]` or `[S1]` identifiers, abstain when evidence is absent, and distinguish planned work from completed work. Citation correctness still needs evaluation.

## Streaming contract

POST `/api/chat` accepts `{message, history}` and returns SSE frames. `sources` arrives before text; `token` carries `{text}`; `done` carries provider and elapsed time; `error` reports an interrupted stream without provider details. Pre-stream failures use HTTP errors. The frontend treats EOF without `done` as an interruption.

Blocking SDK work runs off the async event loop. A process semaphore bounds in-flight requests. Disconnects stop further iteration and close streams; an in-progress synchronous network read may continue until its timeout. Either provider can be selected as primary; auto prefers Groq when its key is configured. The other provider is attempted only before any text, never midway through an answer. This default follows live observations: Gemini generation frequently timed out while Gemini embeddings and Groq generation succeeded. Embedding failures cannot fall back to Groq.

## Persistence and security boundaries

Browser-local history avoids accounts and server-side personal-data storage. It is device-local, can be cleared by the browser, and is not encrypted storage. The UI limits persisted history to 30 conversations and 100 messages per conversation; requests send only six complete turns.

API inputs have body, message, history, and role limits. Provider exception contents are not sent to clients or logged. Logs record request IDs, provider, output length, and elapsed time rather than conversations. Credentials remain server-side. Markdown raw HTML is not rendered and embedded remote images are suppressed.

Per-IP rate limiting and concurrency controls protect a single process. Production needs HTTPS, explicit trusted proxies, provider budget alerts, and external limits if scaled. Prompt injection remains a model-level risk; the application has no arbitrary code execution or tools with side effects.

## What to explain in an interview

1. Why embeddings need a versioned compatibility contract.
2. Why cosine distance is not a calibrated confidence score.
3. Why atomic activation protects users from partially built indexes.
4. Why provider fallback must stop after the first visible token.
5. Why retrieved sources and answer citations do not prove factual correctness.
6. Why browser-local history and direct SDKs are appropriate for this product's current scope.

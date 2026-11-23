# Updating Aoun AI projects

The project cards and the AI assistant use separate content sources. Updating both keeps the visible portfolio and chat answers consistent.

## November 23, 2026 update

The selected project order is AutoSalon, Reel2Build, DataBuddy, AskOne, News Classifier, and DueBee. AutoSalon and Reel2Build were added ahead of the existing four cards, preserving those four projects' relative order. Laptop Price Prediction, BloodBridge, and other academic projects remain available in the knowledge base.

The descriptions were curated from the AutoSalon and Reel2Build repository READMEs. Their repositories are private. AutoSalon's card indicates that its repository is private; Reel2Build links to the live demo documented in its README. Repository-reported features and deployment information are distinguished from independently verified behavior.

## Where to edit

1. Update `frontend/src/content.ts`. The `projects` array renders in order, so its first entry is the first card. The same file contains the welcome question that introduces the featured work.
2. Add or edit public Markdown in `knowledge/projects/`. Use `visibility: public` only for content intended for visitors. Include the summary, stack, architecture, actual features, evidence, and limitations.
3. Update `knowledge/profile.md`. It is supplied as core context with every live answer, so it records the featured order and short summaries. `knowledge/knowledge-policy.md` tells the assistant to follow that order for broad introductions while answering specific project questions directly.
4. Rebuild the retrieval index and portable snapshot. The index embeds the public documents; the snapshot lets Render restore the matching Chroma collection without re-embedding on every startup.

```powershell
.\.venv\Scripts\python.exe -m backend.ingest --dry-run
.\.venv\Scripts\python.exe -m backend.ingest
.\.venv\Scripts\python.exe -m backend.index_snapshot export
```

The ingestion step uses the existing server-side Gemini credential and makes embedding API calls. Never put credentials in project descriptions or frontend code. Do not deploy changed knowledge with the old snapshot: compatibility checks intentionally reject it.

## Verify and release

Run the Python tests, frontend tests and build, then the browser tests. Use the evaluation cases for AutoSalon, Reel2Build, and project priority to inspect retrieval and answers. A successful keyword lookup checks the offline preview; live semantic retrieval and generated answers require provider access.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m backend.run_eval --mode lexical
cd frontend
npm test
npm run build
npm run test:e2e
```

Commit the intended source files and refreshed `deployment/public-index.json.gz` together. Review the diff before pushing to `main`, which is the existing deployment branch for Vercel and Render. Verify both deployments and the public site's cards and chat before reporting that the change is live. Unrelated uncommitted work must be reviewed separately.

## Local verification for this update

The refreshed snapshot contains 89 chunks from 18 public documents. All 35 Python tests and 18 frontend unit tests passed, and the production frontend build passed. The offline evaluation completed all 23 cases without runtime errors; its source hit rate was 17/18, which is a keyword-lookup diagnostic rather than a measure of generated-answer accuracy. Focused live checks retrieved the expected source first for AutoSalon, Reel2Build, and project priority. Both project answers passed term/citation checks; the priority answer passed on retry after a provider rate-limit failure and listed all six projects in the requested order.

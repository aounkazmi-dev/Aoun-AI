# Deployment guide

## Vercel frontend + Render backend (free tiers)

**Status:** deployed and verified on October 24, 2026. Frontend: [aoun-abbas-ai.vercel.app](https://aoun-abbas-ai.vercel.app). Backend: [aounos-api.onrender.com](https://aounos-api.onrender.com/api/ready). Live browser verification covered SSE streaming, CORS, sources, resume download, mobile layout, and history after reload.

Vercel project: `aounos`. Render service: `srv-dbe8e1dg1s2s73eog100` in the owner's confirmed workspace, free plan, Oregon. Both track `main`. The repository remains private.

Vercel serves `frontend/` as a Vite static application. Render runs FastAPI from the repository root. Chroma runs inside that service; no third database service is needed. `deployment/public-index.json.gz` contains public embedding vectors keyed by chunk IDs and an embedding/corpus compatibility contract. The public documents themselves come from `knowledge/`.

At startup, Render validates the snapshot against the current source files and restores Chroma under `/tmp/aounos-chroma`, without embedding API calls. This directory is disposable: each cold start can reconstruct the same index. This supports the current read-only public corpus, not user uploads or server-side chat storage. Conversation history remains in each visitor's browser.

### Render configuration

Import the root `render.yaml` Blueprint from `https://github.com/aounkazmi-dev/Aoun-AI`. It specifies the free Python service, locked dependencies, startup restore, one worker, and `/api/ready` health check. Supply these values in Render:

The existing service was provisioned directly through the Render connector rather than linked to a Blueprint. It currently auto-deploys on commits and uses Render's default TCP health check; `/api/ready` was separately verified over HTTPS. The Blueprint documents the desired HTTP readiness check and deployment-after-CI configuration for a future managed Blueprint rollout. Do not import a second service just to change these settings.

| Variable | Value |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini credential for query embeddings |
| `GROQ_API_KEY` | Server-side Groq credential for primary generation |
| `ALLOWED_ORIGINS` | Exact production Vercel origin without trailing slash; comma-separated if multiple |

Never put provider secrets in Vercel `VITE_*` variables or Git. The Blueprint contains names, not credentials.

Render free instances sleep after inactivity and have ephemeral storage, so first visits may wait for startup. See [official free-tier limits](https://render.com/docs/free). Persistent disks require a paid service. If upgrading later, attach a disk and point `CHROMA_DIR` at its mount path; keep startup restore to handle corpus changes. See [disk documentation](https://render.com/docs/disks).

The chat client waits for `/api/ready` before posting a question, allowing up to 90 seconds for startup. It shows a connecting message while waiting and automatically retries temporary network, gateway, or pre-token stream failures (at most three chat attempts). Stop cancels both startup and chat. Validation errors, rate limits, and answers that have already streamed text require manual retry. This handles wake-up failures; it does not eliminate the free instance's startup delay. Deploy the updated frontend to enable this behavior; no backend configuration change is required.

### Vercel configuration

Import the same repository with **Root Directory `frontend`**, framework Vite, build `npm run build`, output `dist`. `frontend/vercel.json` supplies build and security headers.

Before building, set `VITE_API_BASE_URL` to the actual Render HTTPS origin, such as `https://<assigned-service>.onrender.com`. This is public configuration. API calls go directly to Render and stream SSE; no Vercel Function or proxy is required. Add the actual Vercel production origin to Render's `ALLOWED_ORIGINS`. Preview deployments need explicitly allowed origins if they should use live chat.

Current production value: `VITE_API_BASE_URL=https://aounos-api.onrender.com`. Render permits the production origins `https://aoun-abbas-ai.vercel.app`, `https://aounos.vercel.app`, and the account's production Vercel alias. Provider credentials were configured only in Render, with the owner's explicit consent.

### Updating projects later

1. Edit the appropriate public `knowledge/` documents and frontend project descriptions.
2. Run `python -m backend.ingest` locally using the configured Gemini key.
3. Run `python -m backend.index_snapshot export` to refresh the portable index.
4. Run tests and review live answers for affected projects.
5. Commit source changes and snapshot together, then push to GitHub.

CI checks that the shipped snapshot matches the corpus. Stale or incompatible snapshots fail startup before serving mismatched answers. Changes to embedding dimensions/model or chunking also require ingestion and export.

### Hosted verification

Confirm Render reaches `live`, `/api/ready` returns 200, and Vercel reaches `READY`. From the Vercel site verify a streamed answer, sources, resume download, mobile layout, and browser console. Check CORS with the production origin. CORS is not authentication or a spending limit; configure provider budgets separately.

## Alternative: single-service Docker deployment

The production build serves React and FastAPI together. This avoids cross-origin configuration and supports a persistent local Chroma volume. The Dockerfile builds the frontend, installs locked Python dependencies, runs as a non-root user, and exposes port 8000.

```text
docker compose build
docker compose run --rm app python -m backend.ingest
docker compose up -d
```

Create `.env` from `backend/env.example` first, populate keys locally, and set `DEMO_MODE=false`. For an offline preview set `DEMO_MODE=true` and skip ingestion. Compose binds to loopback by default; put a TLS reverse proxy in front for public access.

The container files and CI workflow are supplied for deployment. Building/running them on a target Linux host is a separate validation step; a successful local Windows test does not prove a Docker deployment.

## Hosting requirements

- A Python-capable container host with persistent disk mounted at `/data/chroma`.
- Runtime secrets for `GEMINI_API_KEY`, optional `GROQ_API_KEY`, and configuration.
- A build that completes before traffic is switched, then ingestion against the mounted volume when knowledge changes.
- Readiness probe `/api/ready` (compatible local index and key configured), liveness `/api/health`.
- Streaming response buffering disabled; adequate request/idle timeouts.
- HTTPS, request-size enforcement, and perimeter limits. Keep one application worker for the current in-memory limiter.

The shipped command disables proxy headers. Behind a trusted proxy, explicitly configure Uvicorn's trusted proxy IPs and enable proxy headers; never trust arbitrary forwarded client IPs. Without this, all proxied visitors may share one rate-limit bucket. Multiple replicas require a shared limiter and an appropriate shared/read-only index strategy.

## Rollout checklist

1. Run Python, frontend, and browser tests.
2. Build the image on the deployment architecture.
3. Configure runtime secrets; do not bake `.env` into images.
4. Run ingestion and semantic/answer evaluation against the intended model.
5. Review unsupported, privacy, and injection cases manually.
6. Verify first-token timing, disconnect behavior, fallback, and provider budgets on staging.
7. Check mobile UI, HTTPS, proxy settings, and readiness before enabling public traffic.

The local setup commands do not change hosting or repository visibility. Track actual deployment status separately from these instructions.

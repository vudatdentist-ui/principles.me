# Principles — Human Wisdom OS

Principles is a Next.js application for evidence-grounded Council reasoning. It is built from the Vercel `chatbot` base, but the active product surface is Principles-specific: Brain, graph, thinker constellation, Council, and the emerging Decision/Principle domain.

## Architecture

- `Next.js App Router` owns the UI and server-side Council endpoint.
- `React Three Fiber + Three.js` renders the interactive Brain/Graph/Constellation/Council modes.
- `RAGFlow` remains a separate service. The app only calls its `/api/v1/retrieval` HTTP API.
- `DeepSeek` is the reasoning/synthesis model and receives only retrieved RAGFlow chunks.
- `lib/principles-graph.ts` is the current Principles knowledge-graph model.
- `lib/db/schema.ts` owns persistence, including Decision, Judgment, Principle, DecisionPrinciple, and DecisionOutcome.
- `public/brain.glb` is the active brain mesh used by the R3F renderer.

See `docs/repo-inventory.md` for the boundary between active Principles code and retained Vercel-chatbot legacy code.

## Local run

Requirements: Node 20+, pnpm 10.32.1, PostgreSQL, and Docker Desktop when running RAGFlow locally.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Set POSTGRES_URL. Add provider credentials only for workflows that need them.
pnpm db:migrate
pnpm db:verify
pnpm dev
```

Open `http://localhost:3000`.

The migration command fails when `POSTGRES_URL` is missing. Silent migration skipping is intentionally not supported.

For environment separation and secret handling, see `docs/environment-policy.md`.

If the supplied reference asset changes, regenerate the mesh with `pnpm brain:extract`.

## RAGFlow service

RAGFlow is intentionally not merged into this Next.js project. To bootstrap the official pinned service locally:

```powershell
pnpm ragflow:bootstrap
```

The script clones the official RAGFlow repository at `v0.26.4` into `infra/ragflow/upstream` and runs its Docker Compose stack.

After the RAGFlow UI is ready:

1. Create a dataset and an API key in RAGFlow.
2. Set `RAGFLOW_API_KEY` and `RAGFLOW_DATASET_IDS` in `.env.local`.
3. Seed licensed or user-owned source material with `pnpm ragflow:seed`.

RAGFlow credentials and provider API keys are server-only secrets.

## Verification

The canonical pull-request gate is `.github/workflows/ci.yml`. It starts from a fresh checkout and runs:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm db:check
pnpm db:migrate
pnpm db:verify
pnpm build
pnpm test:e2e
```

CI provides a disposable PostgreSQL 16 database. `pnpm db:verify` performs real inserts/deletes against the migrated database to verify the Decision-domain tables, enums, indexes, ownership columns, and delete behavior.

Playwright runs the current Principles product smoke suite rather than the inherited chatbot selectors. The safety smoke test deliberately leaves RAGFlow unconfigured and verifies that Council fails closed instead of fabricating evidence.

## Decision domain lifecycle

The foundation schema supports:

`draft → exploring → decided → review_due → reviewed → archived`

Principles support `active → revised → retired` plus an explicit revision number. Domain records are user-owned, and domain child records use explicit cascade/set-null behavior so deletion semantics are deterministic.

## Deploy

For the current Hostinger VPS deployment, the Next.js app and RAGFlow remain separate Docker services. The app uses `docker-compose.hostinger.yml` and Traefik on the existing `coolify` network:

```bash
docker compose -f docker-compose.hostinger.yml up -d --build
```

RAGFlow is managed independently under `infra/ragflow/upstream/docker`.

For Vercel or another managed deployment, inject runtime secrets through the deployment platform rather than committed env files. At minimum, production workflows that use Council need the DeepSeek and RAGFlow variables documented in `.env.example`; persistence workflows also require `POSTGRES_URL`.

Do not commit `.env.local`, API keys, database URLs, provider tokens, or production data. A deployment without reachable RAGFlow may load the visual app, but Council must report insufficient evidence rather than invent citations.

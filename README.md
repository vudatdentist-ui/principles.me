# Principles

Principles is being rebuilt as a **personal and business management platform**.

The product is intentionally at a fresh baseline. The only application capability currently treated as implemented is **knowledge Q&A backed by RAGFlow and an AI model**. Previous product concepts such as Thinker Machine, Council, Brain, Decisions, Principles Graph, Review workflows, and the old V2 product shell are legacy and must not be used as requirements for new work.

Read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) before making product or architecture changes.

## Current baseline

```text
User question
    |
    v
RAGFlow retrieval
    |
    v
Normalized evidence
    |
    v
DeepSeek answer stream
    |
    v
Answer + inspectable sources
```

Implemented today:

- RAGFlow retrieval from configured datasets.
- DeepSeek provider with streaming responses and typed provider errors.
- A minimal `/api/ask` NDJSON streaming API.
- A minimal Knowledge Q&A workspace at `/`.
- Source display for retrieved RAG evidence.
- RAGFlow bootstrap/seeding scripts.
- Production health and smoke checks for the Q&A baseline.

Not implemented yet:

- personal data model;
- organization/workspace model;
- authentication and authorization for the rebuilt product;
- tasks, projects, CRM, finance, HR, operations, goals, notes, dashboards, or automation domains;
- durable conversation/history model;
- product-specific AI agents or decision workflows.

Those areas start from new requirements. Do not infer their design from deleted legacy code.

## Repository shape

The active application architecture is intentionally small:

```text
app/
  api/ask/       # Q&A streaming endpoint
  api/health/    # deployment readiness
  page.tsx       # current product surface
features/
  ask/            # Q&A client UI
  evidence/       # normalized evidence + RAGFlow provider
lib/
  ai/providers/   # DeepSeek provider abstraction
scripts/
  bootstrap-ragflow.ps1
  seed-ragflow.mjs
  smoke-production.mjs
  deploy-production.sh
```

Everything else should earn its way back into the repository through a current product requirement.

## Local development

Requirements: Node 20+, pnpm, and a reachable RAGFlow service.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure at minimum:

```text
DEEPSEEK_API_KEY=
RAGFLOW_BASE_URL=http://localhost:9380
RAGFLOW_API_KEY=
RAGFLOW_DATASET_IDS=
```

Open `http://localhost:3000`.

## RAGFlow

RAGFlow remains a separate service. Bootstrap the pinned upstream stack on Windows with:

```powershell
pnpm ragflow:bootstrap
```

Seed a dataset with:

```powershell
$env:RAGFLOW_API_KEY='your-key'
$env:RAGFLOW_DATASET_ID='your-dataset-id'
$env:RAGFLOW_DOCUMENT_DIR='C:\Source'
pnpm ragflow:seed
```

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
```

## Production

`principles.me` is deployed as a Docker service behind the existing Traefik/Coolify network. The deployment health endpoint is `/api/health` and the canary smoke test exercises a real `/api/ask` request before promotion.

Do not commit `.env.local`, `.env.production`, API keys, or RAGFlow credentials.

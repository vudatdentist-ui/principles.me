# Principles

Principles is being rebuilt as a **personal and business management platform**.

The current product baseline is deliberately small: **private RAG knowledge + live public search + AI Q&A**. Previous product concepts such as Thinker Machine, Council, Brain, Decisions, Principles Graph, Review workflows, and the old V2 shell are legacy and are not requirements for new work.

Read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) before making product or architecture changes.

## Current baseline

```text
User question
    |
    v
Retrieval policy
    |
    +----------+----------+
    |                     |
    v                     v
RAGFlow               Brave Search
private knowledge      current web
[R#]                   [W#]
    |                     |
    +----------+----------+
               |
               v
       Normalized evidence
               |
               v
           DeepSeek
               |
               v
      Answer + citations
```

Implemented today:

- RAGFlow retrieval from configured private datasets.
- Brave Search integration for current public web evidence.
- `auto | always | off` live-search routing policy.
- Parallel private/live retrieval when live search is required.
- Shared evidence contract with private `[R#]` and live `[W#]` citations.
- DeepSeek streaming responses with citation guardrails.
- Minimal `/api/ask` NDJSON streaming API and Q&A workspace at `/`.
- Inspectable source display.
- Production health and smoke checks.

Not implemented yet:

- personal data model;
- organization/workspace model;
- authentication and authorization for the rebuilt product;
- tasks, projects, CRM, finance, HR, operations, goals, notes, dashboards, or automation domains;
- durable conversation/history model;
- live structured business connectors;
- product-specific AI agents or decision workflows.

Those areas start from new requirements. Do not infer their design from deleted legacy code.

## Repository shape

```text
app/
  api/ask/       # Hybrid retrieval + Q&A streaming endpoint
  api/health/    # deployment readiness
  page.tsx       # current product surface
features/
  ask/            # minimal Q&A UI
  evidence/       # evidence contract, live-search policy, RAGFlow + Brave
lib/
  ai/providers/   # DeepSeek provider abstraction
scripts/
  bootstrap-ragflow.ps1
  seed-ragflow.mjs
  smoke-production.mjs
  deploy-production.sh
```

## Local development

Requirements: Node 22+, pnpm, a reachable RAGFlow service, and optionally a Brave Search API key.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure private knowledge:

```text
DEEPSEEK_API_KEY=
RAGFLOW_BASE_URL=http://localhost:9380
RAGFLOW_API_KEY=
RAGFLOW_DATASET_IDS=
```

Enable live web evidence:

```text
LIVE_SEARCH_MODE=auto
BRAVE_SEARCH_API_KEY=
```

`auto` only searches questions with freshness/current-data signals. Use `always` to search every question or `off` to disable it. Live search is best-effort by default; set `LIVE_SEARCH_REQUIRED=true` only when production must fail readiness without a configured live provider.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
```

## Production

`principles.me` is deployed as a Docker service behind the existing Traefik network. The deployment health endpoint is `/api/health` and the canary smoke test exercises `/api/ask` before promotion.

Do not commit `.env.local`, `.env.production`, API keys, or RAGFlow credentials.

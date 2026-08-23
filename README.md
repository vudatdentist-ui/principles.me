# Principles

Principles is being built as an **evolution system for people first and organizations second**.

The current production-code baseline is deliberately small: **private RAG knowledge + live public search + AI Q&A**. The next product work follows the Principles Kernel rather than rebuilding conventional task, OKR, CRM, or legacy V2 concepts.

Read these before making product or architecture changes:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — current source of truth, phase progress, and active boundaries.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — product philosophy, domain language, AI and Reality model.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — minimal-interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — sequential major phases, Definition of Done, and expected outcomes.

## Product direction

The kernel is the loop:

```text
Goal
  ↓
Reality
  ↓
Problem
  ↓
Diagnosis
  ↓
Design
  ↓
Execution
  ↓
Outcome
  ↓
Reflection
  ↓
Principle
  ↓
Evolve
  ↺
```

The product is grounded in three connected ideas from Ray Dalio's *Principles*:

- Dreams + Reality + Determination;
- the 5-Step Process;
- Pain + Reflection = Progress.

Principles for People is built first. Principles for Organizations will later extend the same kernel from a personal machine to a collective machine of people and culture.

## Current implemented baseline

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

The Q&A stack is now considered the first implementation of the future **Reality Engine**, not the final product surface.

## Not implemented yet

- identity/session and Personal Workspace;
- durable Principles Kernel domain state;
- Activity Event history;
- Goal Discovery, Problem, Reflection, and living Principle flows;
- self-model and longitudinal learning;
- Design/Execution loop;
- organization workspace, roles, culture, governance, or believability;
- CRM, finance, HR, or other management domain products;
- live structured business connectors.

Do not infer these from deleted legacy code.

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
docs/product/
  PRINCIPLES_KERNEL_SPEC_V1.md
  UI_PRINCIPLES.md
  PHASE_PLAN.md
scripts/
  bootstrap-ragflow.ps1
  seed-ragflow.mjs
  smoke-production.mjs
  deploy-production.sh
```

## UI constraint

The interface stays minimal even as the system becomes intelligent and structurally deep.

Core rule:

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure, and evidence on demand.

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

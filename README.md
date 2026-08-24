# Principles

Principles is being built as an **evolution system for people first and organizations second**.

The active Phase 1 baseline combines a secure Personal Workspace and durable kernel substrate with the existing **private RAG knowledge + live public search + AI Q&A** Reality Engine.

Read these before making product or architecture changes:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — current source of truth, phase progress, and active boundaries.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — product philosophy, domain language, AI and Reality model.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — minimal-interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — sequential major phases, Definition of Done, and expected outcomes.
- [`docs/product/PHASE_1_ARCHITECTURE.md`](./docs/product/PHASE_1_ARCHITECTURE.md) — Phase 1 acceptance contract.

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

Principles for People is built first. Principles for Organizations will later extend the same kernel from a personal machine to a collective machine of people and culture.

## Current implemented baseline

```text
Authenticated user
      |
      v
Personal Workspace
      |
      +-----------------------------+
      |                             |
      v                             v
Durable kernel                 /api/ask quota
PostgreSQL                          |
                                    v
                             Retrieval policy
                                    |
                         +----------+----------+
                         |                     |
                         v                     v
                     RAGFlow               Brave Search
                  workspace scope           current web
                       [R#]                    [W#]
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
                           Answer + safe sources
```

Implemented in Phase 1:

- first-party email/password authentication with scrypt password hashing;
- opaque, hashed, revocable Postgres-backed sessions;
- bootstrap-only first-account mode for production;
- one owned Personal Workspace per initial user and durable membership state;
- PostgreSQL 16 migration/checksum infrastructure and health readiness;
- workspace-owned Goal/Evidence/Observation/Reflection/Principle/AI Suggestion foundations and Activity Events;
- workspace-scoped RAGFlow dataset bindings;
- authenticated `/api/ask` with durable per-workspace usage limiting before provider calls;
- safe client evidence projection that excludes private RAG IDs, internal URLs and full chunks;
- RAGFlow + Brave Search + DeepSeek streamed Q&A with citation guardrails;
- private Postgres production topology, pre-migration snapshots, canary and rollback-safe application promotion;
- real-PostgreSQL integration tests and authenticated browser smoke coverage.

Phase 1 is substrate, not the completed People product. The first complete user learning loop belongs to Phase 2.

## Not implemented yet

- password reset, email verification, OAuth or passkeys;
- organization workspaces, invites, workspace switching and organization permissions;
- Goal Discovery, Problem, Diagnosis, Design, Reflection and living Principle product flows;
- self-model and longitudinal learning;
- durable conversational history;
- full Design/Execution/task/project loop;
- CRM, finance, HR, or other management domain products;
- live structured business connectors;
- scheduled/off-host database backup and automated restore operations.

Do not infer these from deleted legacy code.

## Repository shape

```text
app/
  api/ask/          # authenticated hybrid retrieval + Q&A stream
  api/auth/         # signup, sign-in, sign-out
  api/me/           # current identity/workspace projection
  api/health/       # DB + provider deployment readiness
  page.tsx          # identity gate + Q&A surface
db/migrations/      # durable kernel schema
features/
  ask/              # minimal Q&A UI
  auth/             # identity/session/workspace access
  evidence/         # evidence contracts, policies, RAGFlow + Brave
  kernel/           # durable kernel repositories/activity
  security/         # durable usage/rate limits
lib/
  ai/providers/     # DeepSeek provider abstraction
  db/               # Postgres config/client/health
docs/product/
  PRINCIPLES_KERNEL_SPEC_V1.md
  UI_PRINCIPLES.md
  PHASE_PLAN.md
  PHASE_1_ARCHITECTURE.md
  PHASE_1_OPERATIONS.md
scripts/
  ci-postgres.sh
  migrate.mjs
  smoke-production.mjs
  deploy-production.sh
```

## UI constraint

The interface stays minimal even as the system becomes intelligent and structurally deep.

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure, and evidence on demand.

## Local development

Requirements: Node 22+, pnpm, PostgreSQL 16, a reachable RAGFlow service, and optionally a Brave Search API key.

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

For local development, `AUTH_SIGNUP_MODE=open` allows test accounts. Production uses bootstrap mode and a server-owned setup key.

Configure the core providers in `.env.local`:

```text
DEEPSEEK_API_KEY=
RAGFLOW_BASE_URL=http://localhost:9380
RAGFLOW_API_KEY=
RAGFLOW_DATASET_IDS=
LIVE_SEARCH_MODE=auto
BRAVE_SEARCH_API_KEY=
```

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
```

CI runs the database tests against a real disposable PostgreSQL 16 process under the unprivileged self-hosted runner user.

## Production

`principles.me` is deployed as a Docker service behind Traefik. The web release joins the public routing network and a separate private data network containing the persistent PostgreSQL 16 service. Additive migrations and a pre-migration dump run before canary promotion; `/api/health` and the authentication-boundary smoke must pass before traffic is promoted.

Do not commit `.env.local`, `.env.production`, API keys, database credentials, bootstrap keys, or RAGFlow credentials.

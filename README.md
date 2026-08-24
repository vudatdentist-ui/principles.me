# Principles

Principles is being built as an **evolution system for people first and organizations second**.

This branch is the Phase 2 stacked development baseline. It inherits the verified Phase 1 secure Personal Workspace + durable kernel substrate and adds the first complete People learning loop:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Phase 1 PR #54 and Phase 2 PR #55 are both still unmerged. `main` and production therefore may not contain the capabilities described in this branch yet.

Read before making product or architecture changes:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — source of truth for current product state and phase boundaries.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — product philosophy and domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — major phases and completion rules.
- [`docs/product/PHASE_1_ARCHITECTURE.md`](./docs/product/PHASE_1_ARCHITECTURE.md) — Phase 1 substrate contract.
- [`docs/product/PHASE_2_ARCHITECTURE.md`](./docs/product/PHASE_2_ARCHITECTURE.md) — Phase 2 implementation/audit contract.

## Product kernel

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

Phase 2 implements only the first complete People learning slice through Principle Candidate. Deep Diagnosis, Design, Actions and Outcomes belong to Phase 3.

## Current Phase 2 stack

### People — authenticated root

The signed-in root is a sparse staged experience:

```text
Goal → Reality → Problem → Reflect → Principle
```

A user can:

- discover a Goal one question at a time;
- persist why it matters, qualitative success conditions, accepted trade-offs and non-negotiable boundaries, with optional measures;
- record Goal-scoped Reality as atomic direct-user Evidence + accepted Observation;
- receive an AI Problem proposal, edit/confirm it, and retain evidence provenance;
- complete a progressive Reflection instead of a journal-like form;
- receive an AI Principle candidate and accept, reject or revise it;
- accept a Principle into `testing` only — never automatically into `trusted`;
- reload and recover durable loop state.

### Knowledge — `/knowledge`

Knowledge Q&A remains a secondary authenticated Reality capability:

```text
Private workspace knowledge -> RAGFlow ------+
                                            |
Current public web ----------> Brave Search -+--> normalized evidence --> DeepSeek
```

Private citations use `[R#]`; live public citations use `[W#]`. Browser source projection strips private RAG dataset/document/chunk identifiers, full chunks and internal RAG URLs.

### Platform substrate inherited from Phase 1

- first-party email/password authentication with scrypt password hashing;
- opaque hashed revocable PostgreSQL sessions;
- one owned Personal Workspace per initial user;
- PostgreSQL 16 durable system of record;
- workspace-scoped RAGFlow bindings and provider quota boundaries;
- safe client data/evidence projection;
- Activity Events and AI Suggestions with provenance/acceptance state;
- checksum-bound migrations and DB-aware health;
- private persistent production Postgres topology, pre-migration snapshot, canary and rollback path;
- real-Postgres integration and authenticated browser verification.

## Security and durability rules

All Phase 2 mutations require trusted same-origin requests and an authenticated session. AI endpoints consume durable per-workspace quota before provider work. Private context is loaded server-side with workspace scope and structured model output is validated before persistence.

Database constraints prevent cross-workspace provenance links, same-workspace Reflection/Problem Goal mismatches, and replay of one AI suggestion into multiple durable Problems or Principles. Principle proposal persistence is atomic with suggestion/provenance/activity state.

## Repository shape

```text
app/
  api/ask/                     # authenticated hybrid retrieval + Q&A stream
  api/auth/                    # signup, sign-in, sign-out
  api/me/                      # current identity/workspace projection
  api/people/                  # Phase 2 Goal/Reality/Problem/Reflection/Principle APIs
  api/health/                  # DB + provider deployment readiness
  knowledge/page.tsx           # authenticated Knowledge Q&A
  page.tsx                     # auth gate + People loop

db/migrations/
  0001_secure_platform_kernel.sql
  0002_people_first_loop.sql
features/
  ask/                         # Knowledge Q&A UI
  auth/                        # identity/session/workspace access
  evidence/                    # evidence contracts, RAGFlow + Brave
  kernel/                      # durable substrate repositories
  people/                      # Phase 2 People contracts, AI, repository, projection, UI
  security/                    # durable usage/rate limits
lib/
  ai/providers/                # DeepSeek provider abstraction
  db/                          # PostgreSQL config/client/health
docs/product/
  PRINCIPLES_KERNEL_SPEC_V1.md
  UI_PRINCIPLES.md
  PHASE_PLAN.md
  PHASE_1_ARCHITECTURE.md
  PHASE_1_OPERATIONS.md
  PHASE_2_ARCHITECTURE.md
scripts/
  ci-postgres.sh
  migrate.mjs
  mock-deepseek.mjs
  smoke-production.mjs
  deploy-production.sh
```

## Verification

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm lint
pnpm test:e2e
```

Integration tests use a destructive shared test database and therefore run with `--test-concurrency=1` until separate databases/schemas are introduced.

The self-hosted PR gates run PostgreSQL 16, migration 0001 + 0002, typecheck, unit tests, real-Postgres integration tests, production build, Biome/shell validation and browser smoke with a deterministic DeepSeek fixture.

## Local development

Requirements: Node 22+, pnpm, PostgreSQL 16, a reachable RAGFlow service, and optionally Brave Search for current public evidence.

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Use the environment reference in `.env.example` for database, authentication, RAGFlow, Brave and DeepSeek configuration.

## UI constraint

The interface stays minimal even as the system becomes structurally deep.

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure and inspectable evidence on demand.

## Not implemented yet

Phase 3 has not started. The current stack does **not** include durable Diagnosis/Design/Action/Outcome workflows, a longitudinal self-model, organization workspaces/invites/switching, generic task/project execution, CRM/finance/HR modules, structured business connectors, durable conversation memory, password reset/email verification/OAuth/passkeys, RAG-binding administration UI, or automated off-host database restore operations.

Do not infer these from deleted legacy code or future phase descriptions.

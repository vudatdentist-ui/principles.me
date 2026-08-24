# Principles

Principles is an **evolution system for people first and organizations second**.

Current merged baseline: Phases 0–2 on `main`.  
Current ready work: **Phase 3 — Design + Execution — PR #57**.

The product kernel is:

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
Actions
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

Read before product/architecture changes:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — current source of truth.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — philosophy/domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — minimal-interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — major-phase program.
- [`docs/product/PHASE_1_ARCHITECTURE.md`](./docs/product/PHASE_1_ARCHITECTURE.md) — secure substrate.
- [`docs/product/PHASE_2_ARCHITECTURE.md`](./docs/product/PHASE_2_ARCHITECTURE.md) — first People learning loop.
- [`docs/product/PHASE_3_ARCHITECTURE.md`](./docs/product/PHASE_3_ARCHITECTURE.md) — Design + Execution acceptance/audit contract.

## People experience

### Learning loop

The signed-in root first helps the user move through:

```text
Goal → Reality → Problem → Reflect → Principle
```

A user can discover a meaningful Goal progressively, record Goal-scoped Reality, recognize a Problem, reflect on what happened, and explicitly test/reject/revise a Principle candidate.

### Change loop — Phase 3

Once the initial learning loop has a reviewed Principle, Principles continues with:

```text
Diagnose → Design → Do → Outcome → Review
```

Phase 3 adds:

- Diagnosis that separates symptom, proximate cause and root-cause hypothesis;
- supporting/contradicting evidence, alternatives, uncertainty and optional confidence;
- user-confirmed/revised Diagnosis state;
- machine Design with rationale, expected result and success signal;
- 1–5 minimal Actions belonging only to that Design;
- durable Action completion/cancellation;
- Outcome blocked until no Actions remain pending;
- expected versus actual Reality comparison;
- atomic Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- post-Outcome Review persisted as Reflection;
- database-enforced Workspace/Goal/Problem/Diagnosis/Design semantic chain;
- no assumption that Action completion means the Design worked.

The UI deliberately does not add Projects, kanban, assignment, sprint or generic task-management navigation.

A normal server render/navigation currently exposes the Phase 3 surface after a Phase 2 Principle is reviewed; the two client surfaces do not yet share one live state store.

## Knowledge — `/knowledge`

Knowledge Q&A remains a secondary authenticated Reality capability:

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ normalized Evidence → DeepSeek
                                       │
Direct observations / Outcomes ─────────┘
```

Private citations use `[R#]`; live public citations use `[W#]`. Public live search receives only the public query, never private RAG excerpts. Browser evidence projection excludes private dataset/document/chunk identifiers, full private chunks and internal RAG URLs.

## Platform substrate

Phase 1 provides:

- first-party email/password authentication with scrypt password hashing;
- opaque hashed revocable PostgreSQL sessions;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- workspace-scoped private retrieval and provider quota boundaries;
- safe client projections;
- Activity Events and AI Suggestions with provenance/acceptance state;
- checksum-bound migrations and DB-aware health;
- private production Postgres topology, pre-migration snapshot, canary and rollback foundations;
- real-Postgres integration and authenticated browser verification.

All private mutation endpoints use trusted same-origin requests plus authenticated Workspace context. AI provider work consumes durable per-workspace quota before model calls. Private state is loaded server-side with Workspace scope and structured AI output is validated before persistence.

## Phase 3 durability rules

Migration `0003_design_execution.sql` adds Diagnosis, Design, minimal execution Actions, Outcome and Outcome→Reflection linkage.

Important invariants:

- cross-workspace and same-workspace semantic mismatches fail;
- one AI suggestion cannot create multiple Diagnoses/Designs;
- retries supersede older pending Diagnosis/Design proposals;
- Design + initial Actions persist atomically;
- Outcome + Evidence + Observation persist atomically;
- Actions cannot mutate after Design evaluation;
- one Outcome evaluates one Design in Phase 3 v1;
- Outcome Review must match the same Goal + Problem;
- client execution state excludes internal Workspace IDs, Evidence UUIDs and AI provenance IDs.

## Repository shape

```text
app/
  api/ask/                         # authenticated hybrid Knowledge Q&A
  api/auth/                        # signup/sign-in/sign-out
  api/me/                          # identity/workspace projection
  api/people/
    goal-discovery/                # Phase 2 Goal Discovery
    goals/ reality/ problems/      # Phase 2 learning state
    reflections/ principles/       # Phase 2 reflection/principle
    diagnoses/                     # Phase 3 Diagnosis
    designs/                       # Phase 3 machine Design
    actions/                       # Phase 3 execution state
    outcomes/ outcome-reviews/     # Phase 3 Reality + Review
    execution/state/               # safe Phase 3 state projection
  api/health/
  knowledge/page.tsx
  page.tsx                         # auth gate + People learning/change loops

db/migrations/
  0001_secure_platform_kernel.sql
  0002_people_first_loop.sql
  0003_design_execution.sql
features/
  ask/
  auth/
  evidence/
  kernel/
  people/                          # People AI/repositories/projections/UI
  security/
lib/
  ai/providers/
  db/
docs/product/
  PRINCIPLES_KERNEL_SPEC_V1.md
  UI_PRINCIPLES.md
  PHASE_PLAN.md
  PHASE_1_ARCHITECTURE.md
  PHASE_1_OPERATIONS.md
  PHASE_2_ARCHITECTURE.md
  PHASE_3_ARCHITECTURE.md
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

Integration tests use a destructive shared test database and run with `--test-concurrency=1` until separate schemas/databases are introduced.

Phase 3 re-audit code head passed Foundation #149, Playwright #251 and Lint #484. Final gates must also pass on the documentation closeout head before merge.

## Local development

Requirements: Node 22+, pnpm, PostgreSQL 16, reachable RAGFlow, DeepSeek, and optionally Brave Search for current public evidence.

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Use `.env.example` as the environment reference.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure, inspectable evidence and empty space when nothing more deserves attention.

## Not implemented yet

Phase 4 has not started. The product does not yet include longitudinal Self Model/pattern learning, generic project/task management, Organization Workspaces/invites/switching, CRM/finance/HR domains, structured business connectors, durable general conversation history, password reset/email verification/OAuth/passkeys, RAG-binding administration UI or automated off-host database restore operations.

Do not infer these from deleted legacy code or future-phase descriptions.

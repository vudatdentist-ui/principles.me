# Principles

Principles is an **evolution system for people first and organizations second**.

**Current baseline:** Phases 0–3 Complete on `main`.  
**Next:** Phase 4 — Learning Engine + Self Model — Planned.

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

Read first:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — source of truth.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — philosophy/domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — phase program.
- [`docs/product/PHASE_1_ARCHITECTURE.md`](./docs/product/PHASE_1_ARCHITECTURE.md) — secure substrate.
- [`docs/product/PHASE_2_ARCHITECTURE.md`](./docs/product/PHASE_2_ARCHITECTURE.md) — first learning loop.
- [`docs/product/PHASE_3_ARCHITECTURE.md`](./docs/product/PHASE_3_ARCHITECTURE.md) — Design + Execution closeout.

## People experience

### Learning loop

```text
Goal → Reality → Problem → Reflect → Principle
```

Goal Discovery is progressive; measures are optional. Reality is Goal-scoped. Problems remain user-confirmed. Reflection is structured. AI Principle candidates can be tested/rejected/revised but are not automatically trusted.

### Change loop

```text
Diagnose → Design → Do → Outcome → Review
```

Phase 3 adds:

- Diagnosis separating symptom, proximate cause and root-cause hypothesis;
- evidence for/against, alternatives, uncertainty and optional confidence;
- user-confirmed/revised Diagnosis;
- machine Design with rationale, expected result and success signal;
- 1–5 minimal Actions belonging only to the Design;
- durable Action completion/cancellation;
- Outcome blocked while Actions remain pending;
- Action completion does not imply Design success;
- atomic Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- expected-vs-actual comparison (`improved | mixed | worse | unclear`);
- post-Outcome Review persisted as Reflection;
- database-enforced Workspace/Goal/Problem/Diagnosis/Design chain;
- no generic Projects/kanban/assignment product.

A normal server render/navigation currently exposes the Phase 3 surface after a Phase 2 Principle is reviewed; the two client surfaces do not yet share one live state store.

## Knowledge — `/knowledge`

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ normalized Evidence → DeepSeek
                                       │
Direct observations / Outcomes ─────────┘
```

Public live search receives only the public query, never private RAG excerpts. Browser source projection strips private internal identifiers/full chunks/internal URLs.

## Platform substrate

- first-party identity/session;
- one owned Personal Workspace;
- PostgreSQL 16 system of record;
- workspace-scoped authorization/retrieval/quota;
- Activity Events and AI Suggestions;
- safe client projections;
- checksum-bound migrations and DB-aware health;
- production Postgres/canary/rollback foundations;
- real-Postgres and browser verification.

## Phase 3 durability rules

Migration `0003_design_execution.sql` adds Diagnosis, Design, execution Actions, Outcome and Outcome→Reflection linkage.

Important invariants:

- tenant and semantic mismatches fail;
- one AI suggestion cannot create multiple Diagnoses/Designs;
- retries supersede stale pending execution proposals;
- Design + Actions are atomic;
- Outcome + Evidence + Observation are atomic;
- Actions cannot mutate after Design evaluation;
- one Outcome evaluates one Design in Phase 3 v1;
- Outcome Review must match Goal + Problem;
- client execution state excludes internal Workspace/Evidence/AI provenance identifiers.

## Repository shape

```text
app/
  api/ask/
  api/auth/
  api/me/
  api/people/
    goal-discovery/ goals/ reality/ problems/
    reflections/ principles/
    diagnoses/ designs/ actions/
    outcomes/ outcome-reviews/
    execution/state/
  api/health/
  knowledge/page.tsx
  page.tsx
db/migrations/
  0001_secure_platform_kernel.sql
  0002_people_first_loop.sql
  0003_design_execution.sql
features/
  ask/ auth/ evidence/ kernel/ people/ security/
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

Final Phase 3 pre-merge verification: Foundation #154 ✅, Lint #489 ✅, Playwright #256 ✅.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure and inspectable evidence.

## Not implemented yet

Phase 4 has not started. There is no longitudinal Self Model/pattern engine, generic project/task product, Organization Workspace collaboration, CRM/finance/HR domain product, structured business connectors, password recovery/OAuth/passkeys, RAG-binding administration UI or automated off-host restore system.

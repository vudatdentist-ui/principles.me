# Principles

Principles is an **evolution system for people first and organizations second**.

**`main`:** Phases 0–3 Complete.  
**This branch:** Phase 4 — Learning Engine + Self Model — **Ready, not merged**.

```text
Goal → Reality → Problem → Diagnosis → Design → Actions → Outcome
  → Reflection → Principle → Learning Pattern → Evolve ↺
```

Read first:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — source of truth.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — philosophy/domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — phase program.
- [`docs/product/PHASE_4_ARCHITECTURE.md`](./docs/product/PHASE_4_ARCHITECTURE.md) — current Phase 4 closeout and verification.

## People

The durable learning/change path now spans:

```text
Goal Discovery → Reality → Problem → Reflection → Principle
                           ↓
                    Diagnose → Design → Do → Outcome → Review
                                                        ↓
                                         Learning Pattern → Principle revision
```

Phase 2 keeps Goals, Reality, Problems, Reflections and Principles user-owned. Phase 3 turns a recognized Problem into a reviewed Diagnosis, machine Design, minimal Actions, observed Outcome and post-Outcome Reflection. Action completion never substitutes for observed Reality.

## Learning — `/learning`

Phase 4 adds a sparse authenticated learning surface:

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → Keep / Edit / Reject
  → optional Principle revision
  → testing again
```

Important rules:

- Self Model means accepted/revised hypotheses, not personality traits or clinical labels;
- fewer than two completed Reflections → no Pattern generation;
- proposal generation uses the 8 most recent completed Reflection cases in chronological order;
- model-facing case/Principle identifiers are ephemeral `C#` / `P#` keys, never durable UUIDs;
- model-facing historical text is bounded;
- `recurring_pattern` requires cases from at least two distinct Problems and is enforced in PostgreSQL;
- Pattern cases preserve Workspace + Goal + Problem + Reflection semantics;
- rejected proposal creates no Pattern row;
- safe client projection excludes Workspace/Evidence/AI provenance/internal semantic join IDs;
- accepted/revised Pattern can drive one explicit Principle revision;
- previous Principle wording is preserved and revised Principle returns to `revised + testing`, never automatically trusted;
- no scores, charts, streaks, trait feed or analytics dashboard.

## Knowledge — `/knowledge`

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ normalized Evidence → DeepSeek
Direct observations / Outcomes ─────────┘
```

Public live search receives only the public query, never private RAG excerpts. Browser projection strips private internal evidence identifiers/full chunks/internal URLs.

## Platform substrate

- first-party identity/session and one owned Personal Workspace;
- PostgreSQL 16 durable system of record;
- Workspace authorization/provenance constraints;
- Activity Events and AI Suggestions;
- durable provider/rate controls;
- safe client projections;
- checksum-bound migrations and DB-aware health;
- production Postgres/canary/rollback foundations;
- real-Postgres integration and authenticated browser verification.

## Repository shape

```text
app/
  api/ask/
  api/auth/
  api/me/
  api/people/
  api/learning/
  knowledge/page.tsx
  learning/page.tsx
  page.tsx
db/migrations/
  0001_secure_platform_kernel.sql
  0002_people_first_loop.sql
  0003_design_execution.sql
  0004_learning_self_model.sql
features/
  ask/ auth/ evidence/ kernel/ people/ learning/ security/
lib/
  ai/providers/
  db/
docs/product/
  PRINCIPLES_KERNEL_SPEC_V1.md
  UI_PRINCIPLES.md
  PHASE_PLAN.md
  PHASE_1_ARCHITECTURE.md
  PHASE_2_ARCHITECTURE.md
  PHASE_3_ARCHITECTURE.md
  PHASE_4_ARCHITECTURE.md
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

Final Phase 4 runtime re-audit before documentation closeout:

- Foundation #163 ✅
- Lint #498 ✅
- Playwright #265 ✅

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure and inspectable evidence.

## Not implemented / intentionally deferred

Phase 4 is not merged yet. There is no proactive/scheduled Learning, unlimited-history semantic Pattern retrieval, personality/psychometric scoring, generic conversation memory, organization collaboration, generic project/task product, CRM/finance/HR product, structured business connectors, password recovery/OAuth/passkeys, RAG-binding administration UI or automated off-host restore system.

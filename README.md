# Principles

Principles is an **evolution system for people first and organizations second**.

```text
Dream + Reality + Determination → Successful Life

5 Steps
Goal → Problem → Diagnosis → Design → Do

Outcome → Pain / Surprise → Reflection → Principle → Evolve ↺
```

**Current major phase:** Phase 6 — Product Recenter / Evolution Engine — in progress / production.  
**Completed major phases:** 0–5.  
**Next major phase:** not defined.

## Start here

For agents/contributors, read in this order:

1. [`AGENTS.md`](./AGENTS.md) — short repository map, commands and red zones.
2. [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — current product/architecture source of truth.
3. [`docs/product/PHASE_6_ARCHITECTURE.md`](./docs/product/PHASE_6_ARCHITECTURE.md) — current evolution contract.
4. [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
5. [`docs/product/INTERACTION_DESIGN.md`](./docs/product/INTERACTION_DESIGN.md) — interaction semantics.
6. [`docs/product/PRODUCT_MEASUREMENT.md`](./docs/product/PRODUCT_MEASUREMENT.md) — privacy-safe product learning.
7. [`docs/engineering/REVIEW_PROTOCOL.md`](./docs/engineering/REVIEW_PROTOCOL.md) — risk/evidence/merge protocol.
8. [`docs/security/THREAT_MODEL.md`](./docs/security/THREAT_MODEL.md) and [`docs/security/DATA_RETENTION.md`](./docs/security/DATA_RETENTION.md) for security/privacy/data work.

Phase 1–5 architecture files are historical delivery records; see [`docs/product/HISTORICAL_DOCS.md`](./docs/product/HISTORICAL_DOCS.md).

## Product surfaces

Authenticated navigation:

```text
Me · Organization · Knowledge · Learning
```

### Me

Users can hold multiple Goals. One selected Goal is projected through its own lineage:

```text
Goal → Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection
```

The 5 Steps are inspectable execution state, not gamified progress. Action completion never substitutes for observed Outcome.

### Organization

A governed collective machine with members, roles, responsibilities, teams, attributable Issues/Disagreements and contextual evidence. There is no global people score, personality label or anonymous culture score.

### Knowledge

`Think from principles.` Shared Principles knowledge, bounded personal context and public live search remain separately attributable. Public live search never receives private personal-history excerpts. Knowledge does not silently write durable personal state.

### Learning

Longitudinal Principles, Reflections and evidence-backed correctable Patterns. Principles remain living hypotheses under test.

## Core invariants

- Evidence/Observation ≠ inference.
- AI suggestion ≠ accepted truth.
- Action completion ≠ successful Outcome.
- Outcome requires observed Reality.
- Reflection may produce no Principle.
- Principles are revisable hypotheses.
- Self Model patterns are correctable, not fixed identity labels.
- Workspace authorization/provenance boundaries are mandatory.
- Private content does not belong in product analytics or operational logs.

## Platform

- Next.js 16 / React 19;
- PostgreSQL 16 durable system of record;
- first-party email/password identity with email verification/password recovery;
- safe Workspace-scoped repositories and database provenance constraints;
- LiteLLM/OpenAI-compatible primary AI route with DeepSeek fallback;
- RAGFlow private retrieval + optional Brave public search;
- checksum-bound migrations;
- real-Postgres integration tests and Playwright browser tests;
- pre-migration production backups, restore verification, canary smoke and exact-SHA production health verification.

## Repository shape

```text
app/                    routes + API boundaries
features/account/       export/deletion lifecycle
features/analytics/     privacy-safe product insights
features/auth/          identity/session
features/evidence/      retrieval/provider boundaries
features/evolution/     Me projection + interactive evolution surface
features/learning/      longitudinal learning
features/organization/  governed collective machine
features/people/        durable personal evolution writes
features/security/      rate/security helpers
lib/ai/providers/       model-provider transport + fallback
lib/db/                 PostgreSQL access/health
db/migrations/          append-only checksum migrations
tests/integration/      real-Postgres boundary tests
tests/e2e/              browser journeys
scripts/                migration/deploy/security/restore/operator tooling
```

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm security:secrets
pnpm quality:gate
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm restore:drill
pnpm build
pnpm lint
pnpm test:e2e
```

CI runs Foundation, Lint, Playwright and a separate Security workflow with CodeQL/dependency review.

## Product learning

The repository reuses semantic `activity_events`; it does not install a third-party behavioral tracker or collect intimate text for analytics.

With database access:

```bash
pnpm product:insights 30
```

Current signals include:

- Goal → Reality → Problem activation;
- median time from Workspace creation to first recognized Problem;
- Reflection return on multiple days;
- Outcome review → accepted/revised Principle learning loop;
- aggregate stage reach.

See [`docs/product/PRODUCT_MEASUREMENT.md`](./docs/product/PRODUCT_MEASUREMENT.md) for interpretation/privacy boundaries.

## Account data controls

Account export/deletion endpoints require active authentication, trusted origin, password re-authentication and rate limiting.

Deletion removes the Personal Workspace. Shared Organization history may retain a disabled pseudonymous identity for referential integrity. Organizations owned by the account require an additional explicit destructive choice before they are deleted.

Provider-side data retention is not implied by application deletion; see [`docs/security/DATA_RETENTION.md`](./docs/security/DATA_RETENTION.md).

## Production delivery

A push to `main` is verified before production deploy. Deployment:

1. verifies application against PostgreSQL;
2. snapshots the production database before migration;
3. restores the exact fresh snapshot into a temporary database and verifies schema history/tables;
4. runs migrations;
5. starts a canary and authenticated smoke test;
6. starts the release container;
7. verifies public health reports the exact merged SHA;
8. verifies canonical routing;
9. performs zero-downtime swap.

A green PR is not considered a successful release until the exact merged SHA is verified in production.

## Current product question

The repository can build and ship the kernel safely enough to move the bottleneck elsewhere. The current question is whether real users reach meaningful insight, return to Reflection and change behavior from observed Reality.

Do not add another major phase merely because implementation is cheap. Learn first, then make the next product decision explicitly.

# Principles

Principles is an **evolution system for people first and organizations second**.

**`main`:** Phases 0–5 **Complete**.  
**Current major phase:** **Phase 6 — Product Recenter / Evolution Engine — In progress.**

Phase 6 organizes the product around three nested ideas:

```text
Dream + Reality + Determination → Successful Life
```

```text
5 Steps to Get What You Want
1 Goal → 2 Problem → 3 Diagnosis → 4 Design → 5 Do
```

```text
Pain + Reflection → Progress
```

These map onto the existing durable kernel:

```text
Dream / Goal → Reality → Problem → Diagnosis → Design → Actions → Outcome
  → Pain / Surprise → Reflection → Principle → Learning Pattern → Evolve ↺
```

For collective machines:

```text
Organization → People / Roles / Responsibilities / Teams
  → shared Goal / Reality / Issues / Disagreement
  → Diagnosis → Design → accountable execution
  → Outcome → Reflection → organizational Principle
```

Read first:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — source of truth.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — philosophy/domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — major phase program.
- [`docs/product/PHASE_4_ARCHITECTURE.md`](./docs/product/PHASE_4_ARCHITECTURE.md) — completed Learning Engine + Self Model architecture.
- [`docs/product/PHASE_5_ARCHITECTURE.md`](./docs/product/PHASE_5_ARCHITECTURE.md) — completed Organizations architecture and governance.
- [`docs/product/PHASE_6_ARCHITECTURE.md`](./docs/product/PHASE_6_ARCHITECTURE.md) — current Product Recenter / Evolution Engine contract.

## Account entry

Normal account creation uses email + password only. **Setup key has been removed.**

- signup is open by default;
- only `AUTH_SIGNUP_MODE=disabled` closes account creation;
- a legacy `AUTH_SIGNUP_MODE=bootstrap` value is treated as open rather than requiring a hidden secret;
- origin validation, password rules, rate limiting and session security remain in force.

New accounts must verify their email before the first sign-in. Verification and password recovery links are sent through Brevo. Configure `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL` only in the server environment; never commit the API key.

## People

The durable personal evolution path spans:

```text
Dream / Goal → Reality → Problem → Diagnosis → Design → Do → Outcome
                                               ↓
                                  Pain / Reflection → Principle
                                                        ↓
                                         Learning Pattern → revision
```

Phase 6 is recentering People so the future primary surface shows the active Dream, current Reality, active Gap/Problem, current 5-Step position and one next meaningful action instead of exposing the underlying ontology as a stack of modules.

The foundation tranche adds a read-only `EvolutionState` projection over the existing People + Execution state. No destructive migration is required.

## Learning — `/learning`

Phase 4 established longitudinal Learning:

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → Keep / Edit / Reject
  → optional Principle revision
  → testing again
```

Self Model means accepted/revised hypotheses, not personality traits or clinical labels. Phase 6 will recenter Learning around recurring Patterns, unresolved Reflection opportunities and living Principles under test.

## Organization — `/organization`

Phase 5 is merged and production-verified. It extends the People kernel into a governed collective machine:

```text
Organization
  → explicit roles / responsibilities / teams
  → observed Issue
  → attributable Disagreement
  → contextual track record
  → accountable resolution
```

Important rules:

- creator becomes Organization owner;
- client navigation uses a safe `org_...` handle rather than Workspace UUID;
- owner manages members, roles, responsibilities, role assignments and teams;
- ordinary members cannot mutate machine structure;
- members can record Issues, Disagreements and contextual evidence;
- PostgreSQL constraints prevent cross-organization structural references;
- contextual track record preserves evidence-for/evidence-against and attribution;
- there is no global believability score, employee ranking, personality label or anonymous culture score.

Phase 6 will apply the same Dream → Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection → Principle orchestration to the governed collective machine after the personal loop is recentered.

## Knowledge — `/knowledge`

```text
Shared Principles knowledge → retrieval ─┐
Current public web → live search ────────┼→ normalized Evidence → AI
Direct observations / Outcomes ──────────┘
```

Shared Principles knowledge is available to authenticated users; Personal Workspace history remains private and workspace-scoped. Public live search receives only the public query, never private personal-history excerpts. Browser projection strips private internal evidence identifiers/full chunks/internal URLs.

Phase 6 will recenter Knowledge from a generic “Ask anything” mental model toward “Think from principles,” with explicit confirmation before any future durable bridge into active People/Organization state.

## Phase 6 foundation — EvolutionState

The first Phase 6 tranche adds:

```text
PeopleState + ExecutionState
            ↓
    projectEvolutionState()
            ↓
       EvolutionState
```

`EvolutionState` exposes one coherent active lineage and semantic orchestration:

- Dream;
- current Reality;
- Problem / Gap;
- Diagnosis;
- Design;
- Actions;
- Outcome;
- Reflection;
- Principle;
- 5-Step status;
- high-value attention;
- one next action.

The authenticated read-only API is:

```text
GET /api/evolution/state
```

The projection reuses the existing safe People/Execution client projectors and does not introduce an `evolution_cycles` table in this tranche.

## Platform substrate

- first-party identity/session and owned Personal Workspace;
- PostgreSQL 16 durable system of record;
- Workspace authorization/provenance constraints;
- Organization Workspaces with owner/member governance;
- Activity Events and AI Suggestions;
- durable provider/rate controls;
- safe client projections;
- checksum-bound migrations and DB-aware health;
- self-contained production Node runtime with direct Node migrations;
- pre-migration DB backup, internal-only data network, canary health/smoke and exact-SHA public deployment verification;
- real-Postgres integration and authenticated browser verification.

## Repository shape

```text
app/
  api/ask/
  api/auth/
  api/evolution/
  api/me/
  api/people/
  api/learning/
  api/organization/
  knowledge/page.tsx
  learning/page.tsx
  organization/page.tsx
  page.tsx
db/migrations/
  0001_secure_platform_kernel.sql
  0002_people_first_loop.sql
  0003_design_execution.sql
  0004_learning_self_model.sql
  0005_organizations.sql
features/
  ask/ auth/ evidence/ evolution/ kernel/ people/ learning/ organization/ security/
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
  PHASE_5_ARCHITECTURE.md
  PHASE_6_ARCHITECTURE.md
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

Phase 5 production baseline remains verified at merge `0fa12577636715437f3208e8289d71931433aa61` / deploy run `32844721161`.

Phase 6 is not Complete until its full recentered loop passes the same repository and production gates.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure and inspectable evidence. The authenticated navigation remains:

```text
People · Organization · Knowledge · Learning
```

## Not implemented / intentionally deferred

Phase 6 foundation does not yet replace the People UI, redesign Pain + Reflection, expose living Principle test evidence, recenter Learning/Knowledge/Organization, or add durable Principle test-event semantics.

Existing deferred platform/product scope such as arbitrary permission matrices, anonymous culture scoring, global people rankings, SSO/SCIM, compensation/performance workflows, structured business connectors, generic project/task management, OAuth/passkeys, RAG-binding administration UI and automated off-host restore remains deferred unless explicitly pulled into a later tranche.

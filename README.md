# Principles

Principles is an **evolution system for people first and organizations second**.

**`main`:** Phases 0–5 **Complete**.  
**Next major phase:** **Not defined; requires an explicit product decision.**

```text
Goal → Reality → Problem → Diagnosis → Design → Actions → Outcome
  → Reflection → Principle → Learning Pattern → Evolve ↺
```

For collective machines:

```text
Organization → People / Roles / Responsibilities / Teams
  → Issue → Disagreement → contextual evidence → governed resolution
```

Read first:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — source of truth.
- [`docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`](./docs/product/PRINCIPLES_KERNEL_SPEC_V1.md) — philosophy/domain language.
- [`docs/product/UI_PRINCIPLES.md`](./docs/product/UI_PRINCIPLES.md) — interface constraints.
- [`docs/product/PHASE_PLAN.md`](./docs/product/PHASE_PLAN.md) — major phase program.
- [`docs/product/PHASE_4_ARCHITECTURE.md`](./docs/product/PHASE_4_ARCHITECTURE.md) — completed Learning Engine + Self Model architecture.
- [`docs/product/PHASE_5_ARCHITECTURE.md`](./docs/product/PHASE_5_ARCHITECTURE.md) — completed Organizations architecture and governance.

## Account entry

Normal account creation uses email + password only. **Setup key has been removed.**

- signup is open by default;
- only `AUTH_SIGNUP_MODE=disabled` closes account creation;
- a legacy `AUTH_SIGNUP_MODE=bootstrap` value is treated as open rather than requiring a hidden secret;
- origin validation, password rules, rate limiting and session security remain in force.

New accounts must verify their email before the first sign-in. Verification and password recovery links are sent through Brevo. Configure `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL` only in the server environment; never commit the API key.

## People

The durable personal learning/change path spans:

```text
Goal Discovery → Reality → Problem → Reflection → Principle
                           ↓
                    Diagnose → Design → Do → Outcome → Review
                                                        ↓
                                         Learning Pattern → Principle revision
```

Phase 2 keeps Goals, Reality, Problems, Reflections and Principles user-owned. Phase 3 turns a recognized Problem into a reviewed Diagnosis, machine Design, minimal Actions, observed Outcome and post-Outcome Reflection. Action completion never substitutes for observed Reality.

## Learning — `/learning`

Phase 4 is merged and production-verified. It adds a sparse authenticated learning surface:

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → Keep / Edit / Reject
  → optional Principle revision
  → testing again
```

Self Model means accepted/revised hypotheses, not personality traits or clinical labels. Proposals use bounded recent history and ephemeral model-facing identifiers; recurring Patterns require multiple distinct Problems; rejected suggestions create no Pattern; revised Principles return to testing, never automatically trusted.

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
- there is no global believability score, employee ranking, personality label or anonymous culture score;
- culture in v1 is visible through attributable Issues, Disagreements and contextual evidence.

## Knowledge — `/knowledge`

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ normalized Evidence → DeepSeek
Direct observations / Outcomes ─────────┘
```

Public live search receives only the public query, never private RAG excerpts. Browser projection strips private internal evidence identifiers/full chunks/internal URLs.

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
  ask/ auth/ evidence/ kernel/ people/ learning/ organization/ security/
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

Phase 5 merge: `0fa12577636715437f3208e8289d71931433aa61`.

Final pre-merge re-audit:

- Foundation #189 ✅
- Lint #524 ✅
- Playwright #291 ✅

Post-merge main verification:

- Foundation #190 ✅
- Lint #525 ✅
- Playwright #292 ✅
- production deploy run `32844721161` ✅
- `MIGRATION_APPLIED=0005_organizations.sql` ✅
- public `/api/health` exact version `0fa12577636715437f3208e8289d71931433aa61` ✅
- canary/public route/zero-downtime gates ✅

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure and inspectable evidence.

## Not implemented / intentionally deferred

Organization invitation delivery/magic links, arbitrary permission matrices, anonymous culture surveys or culture scores, global people rankings, organization-wide AI Pattern generation across unlimited history, SSO/SCIM, compensation/performance-management workflows, structured business connectors, generic project/task management, OAuth/passkeys, RAG-binding administration UI and automated off-host restore remain deferred.

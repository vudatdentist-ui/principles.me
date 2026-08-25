# PROJECT CONTEXT — Principles

**Status:** Phase 5 — Principles for Organizations — **Complete**  
**Effective date:** 2026-08-25  
**Completed on `main`:** Phases 0–5  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
**Phase 4 merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
**Phase 5 merge:** `0fa12577636715437f3208e8289d71931433aa61`  
**Phase 5 production deploy:** run `32844721161` — verified 2026-08-25  
**Next major phase:** **Not defined. Requires an explicit product decision.**

This file is the source of truth for current product direction, architecture, progress and boundaries.

Read with:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_2_ARCHITECTURE.md`
- `docs/product/PHASE_3_ARCHITECTURE.md`
- `docs/product/PHASE_4_ARCHITECTURE.md`
- `docs/product/PHASE_5_ARCHITECTURE.md`

## 1. Product mission

Principles is an **evolution system for people first and organizations second**.

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
Learning Pattern
  ↓
Evolve
  ↺
```

For organizations, the same kernel operates inside an explicit collective machine:

```text
Organization
  → People / Roles / Responsibilities / Teams
  → observed Issues
  → explicit Disagreements
  → contextual track-record evidence
  → governed machine changes
```

The product is not a generic task manager, OKR app, journal, CRM, HR suite, employee-ranking system, personality profiler, analytics dashboard, decision-only app, multi-agent Council or thinker simulator.

## 2. Philosophical / truth invariants

- Desired Reality defines what matters; actual Reality informs the path.
- Problem, Diagnosis, Design, Action and Outcome remain distinct.
- Evidence/Observation are not the same as inference.
- AI output is never accepted truth solely because AI produced it.
- Pain/Outcome + Reflection should feed learning and future machine changes.
- Principles remain revisable hypotheses to test, not immutable rules.
- Self Model means evidence-backed, user-correctable Pattern hypotheses — not fixed identity labels.
- Radical Transparency requires attribution and inspectable evidence; it does not override authorization.
- Believability is contextual track-record evidence, not a global score or fixed judgment about a person.

## 3. Implemented product

### Phase 1 — Secure Platform + Durable Kernel — Complete

First-party identity/session, owned Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, durable usage controls, checksum migrations, DB health, authenticated RAGFlow, Brave live search + DeepSeek, safe client evidence projection and deployment safety foundations.

### Phase 2 — Principles for People: First Complete Loop — Complete

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal meaning stays richer than KPI CRUD; Reality is Goal-scoped; Problems and Principles remain user-reviewed; Reflection is progressive; accepted Principles enter `testing`, never automatically `trusted`.

### Phase 3 — Design + Execution — Complete

```text
Problem → Diagnosis → Design → Actions → Outcome → Review / Reflection
```

Diagnosis separates symptom/proximate/root-cause hypotheses and preserves evidence for/against, alternatives and uncertainty. Design is a machine change with expected result and success signal. Actions only execute Design. Outcome compares expected versus actual Reality, creates Evidence + Observation atomically, evaluates the Design only after Reality is observed, and feeds a linked post-Outcome Reflection.

### Phase 4 — Learning Engine + Self Model — Complete

```text
Durable history
  → Learning Pattern proposal
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → testing again
```

Longitudinal learning uses bounded Workspace-scoped private history, ephemeral model-facing keys, correctable Pattern hypotheses and explicit Principle revision. A revised Principle returns to `testing`, never automatically `trusted`.

### Phase 5 — Principles for Organizations — Complete

```text
Organization
  → explicit machine structure
  → observed Issue
  → attributable Disagreement
  → contextual evidence
  → accountable resolution
```

Implemented and production-verified:

- normal signup no longer exposes or accepts a Setup key;
- signup is open unless `AUTH_SIGNUP_MODE=disabled`; legacy `bootstrap` configuration is treated as open so production is not trapped behind a hidden secret;
- signup still creates an owned Personal Workspace and preserves first-workspace RAG dataset bootstrap behavior;
- authenticated sparse `/organization` surface;
- an authenticated user can create an Organization Workspace and becomes its owner;
- browser/API organization selection uses a safe `org_...` handle rather than exposing the Workspace UUID;
- organization state is readable only by members;
- owner controls members, roles, responsibilities, role assignments, teams and team assignments;
- ordinary members are blocked from structural writes by server authorization, not merely hidden UI;
- cross-organization role/team/member references are rejected by PostgreSQL constraints;
- members can record attributable Issues as observed reality + tension;
- members can raise attributable Disagreements tied to Issues;
- owners can resolve Issues and Disagreements while original statements remain durable;
- members can record context-specific track-record evidence for/against another organization member;
- contextual evidence never becomes a global score, ranking, personality label or fixed identity judgment;
- culture in v1 is represented through attributable Issues, Disagreements and contextual evidence, not anonymous surveys or culture scores;
- Personal Workspace, People, Knowledge and Learning retain their existing private behavior.

## 4. Reality / Learning Engine

```text
Private knowledge → RAGFlow ─────────────┐
Current public reality → Brave ─────────┤
Direct observations ────────────────────┤→ Evidence / history → Principles reasoning
Recorded Outcomes ──────────────────────┤
Completed Reflections / Principles ─────┘

Organization members
  → Issues / Disagreements / contextual evidence
  → inspectable collective reality + governance
```

Public live search receives only the public query, never private RAG excerpts. Longitudinal Learning AI works only with authenticated Workspace-scoped private history server-side. Phase 5 does not introduce organization-wide AI inference or people scoring.

## 5. Production architecture baseline

Production runtime is self-contained after build:

- pnpm/Corepack are build/CI concerns, not runtime dependencies;
- database migrations run as `node scripts/migrate.mjs` on the internal-only data network;
- Next runs from standalone output via `node server.js` with `HOSTNAME=0.0.0.0`;
- pre-migration database backup, canary health/smoke, exact-SHA public health verification and zero-downtime swap remain deployment gates.

Phase 5 production verification on merge `0fa12577636715437f3208e8289d71931433aa61` proved:

- `DEPLOY_DATABASE_READY=1`;
- `DEPLOY_DATABASE_BACKUP_READY=1`;
- `MIGRATION_APPLIED=0005_organizations.sql`;
- `DEPLOY_MIGRATIONS_READY=1`;
- `AUTH_BOUNDARY_SMOKE=1`;
- `DEPLOY_CANARY_SMOKE=1`;
- `DEPLOY_INTERNAL_HEALTH=1`;
- `DEPLOY_PUBLIC_ROUTE_READY=1`;
- `DEPLOY_ZERO_DOWNTIME_SWAP=1`;
- `/api/health` returned `status: ok` and exact version `0fa12577636715437f3208e8289d71931433aa61`.

## 6. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

People and Knowledge remain primary personal surfaces; Learning and Organization are sparse secondary surfaces. Organization structure and evidence use progressive disclosure. No scorecards, employee rankings, trait radar, streaks or analytics dashboard were introduced.

## 7. Phase progress

| Phase | Name | Status | Actual outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product philosophy, language and governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine change → Actions → Outcome → Review works durably. |
| 4 | Learning Engine + Self Model | **Complete** | History yields inspectable/correctable Pattern hypotheses and can revise a Principle back into testing. |
| 5 | Principles for Organizations | **Complete** | A governed collective machine can make roles, responsibilities, issues, disagreement and contextual track record explicit without people scoring. |

## 8. Phase 4 verification

Final synchronized pre-merge head: `a6f21a8dbd66b64c98e61a6e151be5828ea1f2b8`.

- Lint #515 ✅;
- Playwright #282 ✅;
- Foundation #180 ✅.

Post-merge main `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`:

- Foundation #181 ✅;
- Lint #516 ✅;
- Playwright #283 ✅;
- production deploy run `32838276392` ✅.

## 9. Phase 5 audit / verification

The requested self-reinforcing loop corrected:

- stale Setup-key unit coverage that still imported the removed bootstrap module;
- organization switcher ARIA semantics rejected by the repository accessibility/lint rules;
- new Phase 5 CSS `!important` warnings;
- an ambiguous Playwright locator that matched both a visible member row and a role-assignment option.

Final pre-merge head: `424764e8855d37c4b961ab968386dc409e0d7b85`.

- Foundation #189 ✅ — PostgreSQL 16, migrations 0001–0005, typecheck, unit tests, real-Postgres integration tests and production build;
- Lint #524 ✅;
- Playwright #291 ✅ — no Setup key, two-account Organization collaboration, member governance denial, Issue → Disagreement → contextual evidence → owner resolution, plus existing browser smoke.

Post-merge main `0fa12577636715437f3208e8289d71931433aa61`:

- Foundation #190 ✅;
- Lint #525 ✅;
- Playwright #292 ✅;
- production deploy run `32844721161` ✅;
- migration `0005_organizations.sql` applied on production ✅;
- canary, public exact-SHA health and zero-downtime swap ✅.

**Expected outcome achieved:** Principles now supports a real governed collective machine while preserving the People kernel, authorization boundaries, inspectable evidence and the distinction between contextual track record and identity-level scoring.

## 10. Known limitations after Phase 5

- Organization owners add an **existing Principles account by email**; email invitation delivery and magic invitation links are not implemented.
- Authorization is owner/member in v1; there is no arbitrary custom permission matrix.
- `/organization` is a secondary surface rather than a unified global workspace shell.
- Culture is represented through attributable Issues, Disagreements and contextual evidence; there are no anonymous culture surveys or culture scores.
- No organization-wide AI Pattern generation across unlimited history.
- No SSO/SCIM or enterprise directory sync.
- No compensation/performance-management workflows or generic HR product.
- No Slack/CRM/finance/HR connectors.
- No global people rankings or generic project/task management.
- Existing platform gaps such as password recovery and automated off-host restore remain.

## 11. Next boundary

**No next major phase has been defined or started.**

Do not infer a Phase 6 from the existence of Phase 5. The next major phase requires an explicit product decision, its own goal/acceptance contract and the same audit loop.

## 12. Retired architecture

Do not restore without an explicit product decision: Thinker Machine, Council/Council agents, Brain models, historical-thinker personas, Principles Graph/constellation, Decision Workspace/Brief/Run and old V2 route/contracts.

## 13. Contributor rule

```text
Understand requirements
  → lock goal / acceptance criteria
  → implement
  → audit
  → compare against goal
  → fix gaps
  → re-audit
  → production verification
  → close source of truth
  → report
```

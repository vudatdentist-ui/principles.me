# PROJECT CONTEXT — Principles

**Status:** Phase 4 — Learning Engine + Self Model — **Complete**  
**Effective date:** 2026-08-25  
**Completed on `main`:** Phases 0–4  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
**Phase 4 merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
**Phase 4 production deploy:** run `32838276392` — verified 2026-08-25  
**Next major phase:** Phase 5 — Principles for Organizations — **Planned, not started**

This file is the source of truth for current product direction, architecture, progress and boundaries.

Read with:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_2_ARCHITECTURE.md`
- `docs/product/PHASE_3_ARCHITECTURE.md`
- `docs/product/PHASE_4_ARCHITECTURE.md`

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

The product is not a generic task manager, OKR app, journal, CRM, personality profiler, analytics dashboard, decision-only app, multi-agent Council or thinker simulator.

## 2. Philosophical / truth invariants

- Desired Reality defines what matters; actual Reality informs the path.
- Problem, Diagnosis, Design, Action and Outcome remain distinct.
- Evidence/Observation are not the same as inference.
- AI output is never accepted truth solely because AI produced it.
- Pain/Outcome + Reflection should feed learning and future machine changes.
- Principles remain revisable hypotheses to test, not immutable rules.
- Self Model means evidence-backed, user-correctable Pattern hypotheses — not fixed identity labels.

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

Implemented and merged:

- authenticated sparse `/learning` surface;
- no pattern-generation action until at least two completed Reflections exist;
- Pattern kinds: recurring pattern, Design learning, Principle effectiveness and constraint hypothesis;
- AI receives bounded private case summaries via ephemeral `C#` keys and Principle summaries via `P#` keys, not durable UUIDs;
- proposals use the 8 most recent completed Reflections, presented chronologically, with bounded model-facing excerpts;
- unknown/duplicate case keys and unknown Principle keys are rejected;
- `recurring_pattern` requires at least two distinct Problems in AI resolution and deferred PostgreSQL semantics;
- stale pending Learning proposals are superseded on retry;
- user can inspect, correct, keep or reject a Pattern;
- unchanged AI wording → `accepted`; edited wording → `revised`; rejected proposal creates no Pattern row;
- Learning Pattern cases retain Workspace + Goal + Problem + Reflection semantics;
- browser Learning projection excludes Workspace IDs, Evidence UUIDs, AI Suggestion IDs and internal Goal/Problem join IDs;
- accepted/revised active Pattern may drive one explicit Principle revision;
- Principle revision history stores before/after trigger, rule and rationale;
- applying learning changes Principle to `revised + testing`, never `trusted`;
- applied Pattern retains durable Pattern→Principle provenance.

## 4. Reality / Learning Engine

```text
Private knowledge → RAGFlow ─────────────┐
Current public reality → Brave ─────────┤
Direct observations ────────────────────┤→ Evidence / history → Principles reasoning
Recorded Outcomes ──────────────────────┤
Completed Reflections / Principles ─────┘
```

Public live search receives only the public query, never private RAG excerpts. Longitudinal Learning AI works only with authenticated Workspace-scoped private history server-side.

## 5. Production architecture baseline

Production runtime is self-contained after build:

- pnpm/Corepack are build/CI concerns, not runtime dependencies;
- database migrations run as `node scripts/migrate.mjs` on the internal-only data network;
- Next runs from standalone output via `node server.js` with `HOSTNAME=0.0.0.0`;
- pre-migration database backup, canary health/smoke, exact-SHA public health verification and zero-downtime swap remain deployment gates.

Phase 4 production verification on merge `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d` proved:

- `MIGRATION_APPLIED=0004_learning_self_model.sql`;
- `DEPLOY_MIGRATIONS_READY=1`;
- `DEPLOY_CANARY_SMOKE=1`;
- `DEPLOY_PUBLIC_ROUTE_READY=1`;
- `DEPLOY_ZERO_DOWNTIME_SWAP=1`;
- `/api/health` returned `status: ok` and exact version `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`.

## 6. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

People and Knowledge remain primary surfaces; Learning is a sparse secondary surface. Pattern evidence and uncertainty use progressive disclosure. No scorecards, trait radar, streaks or insight feed were introduced.

## 7. Phase progress

| Phase | Name | Status | Actual / expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product philosophy, language and governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine change → Actions → Outcome → Review works durably. |
| 4 | Learning Engine + Self Model | **Complete** | History yields inspectable/correctable Pattern hypotheses and can revise a Principle back into testing. |
| 5 | Principles for Organizations | **Planned** | Extend the proven People kernel to collective machines with governance and permissions. |

## 8. Phase 4 audit / verification

The self-reinforcing loop corrected:

- TypeScript ephemeral-key inference without weakening runtime validation;
- a semantic bypass where a client could relabel same-Problem cases as `recurring_pattern` after AI validation — now blocked by deferred PostgreSQL constraints and real-Postgres tests;
- history selection that could eventually favor old Reflection rows — proposals now use the 8 most recent completed cases;
- unbounded model-facing historical text — case/Principle excerpts are bounded.

Final synchronized pre-merge head: `a6f21a8dbd66b64c98e61a6e151be5828ea1f2b8`.

- Lint #515 ✅;
- Playwright #282 ✅;
- Foundation #180 ✅ — PostgreSQL 16, migrations 0001–0004, typecheck, unit tests, serial real-Postgres integration tests and production build.

Post-merge main verification on `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`:

- Foundation #181 ✅;
- Lint #516 ✅;
- Playwright #283 ✅;
- production deploy run `32838276392` ✅.

**Expected outcome achieved:** Principles can compound value from a real person's own durable history without pretending the resulting Pattern is fixed truth about the person.

## 9. Known limitations after Phase 4

- Pattern discovery is manual/user-triggered; no scheduled/proactive learning jobs.
- Each proposal considers the 8 most recent completed Reflection cases, not semantic retrieval over unlimited personal history.
- One Pattern drives at most one Principle revision in v1.
- `/learning` is a secondary page rather than a shared live state store with People.
- No personality testing/psychometric score/clinical inference product.
- No generic conversation memory, notifications, organization collaboration or structured business connectors.
- Existing platform gaps such as password recovery and automated off-host restore remain.

## 10. Next boundary

**Phase 5 — Principles for Organizations is Planned and has not started.**

Potential scope: Organization Workspaces, people/roles/responsibilities/teams, culture signals, disagreement, permissions/governance and contextual evidence-backed believability. It must preserve the People kernel, privacy boundaries and user-correctable inference model. Radical Transparency must coexist with authorization and accountability.

Do not begin Phase 5 implementation merely because Phase 4 is complete; start it as a new explicitly scoped major phase with its own acceptance contract and audit loop.

## 11. Retired architecture

Do not restore without an explicit product decision: Thinker Machine, Council/Council agents, Brain models, historical-thinker personas, Principles Graph/constellation, Decision Workspace/Brief/Run and old V2 route/contracts.

## 12. Contributor rule

```text
Understand requirements
  → define acceptance criteria
  → implement
  → audit
  → fix
  → re-audit
  → final output check
  → report
```

# PROJECT CONTEXT — Principles

**Status:** Phase 6 — Product Recenter / Evolution Engine — **In progress**  
**Effective date:** 2026-09-08  
**Completed on `main`:** Phases 0–5  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
**Phase 4 merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
**Phase 5 merge:** `0fa12577636715437f3208e8289d71931433aa61`  
**Phase 5 production deploy:** run `32844721161` — verified 2026-08-25  
**Phase 6 start:** 2026-09-08 — explicit product decision  
**Next major phase after Phase 6:** **Not defined.**

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
- `docs/product/PHASE_6_ARCHITECTURE.md`

## 1. Product mission

Principles is an **evolution system for people first and organizations second**.

Phase 6 recenters the product around three nested ideas rather than exposing the kernel as a set of adjacent modules.

North-star equation:

```text
Dream + Reality + Determination → Successful Life
```

Execution backbone:

```text
5 Steps to Get What You Want
1. Goal
2. Problem
3. Diagnosis
4. Design
5. Do
```

Learning feedback loop:

```text
Pain + Reflection → Progress
```

These ideas map onto the durable kernel already built in Phases 1–5:

```text
Dream / Goal
  ↓
Reality
  ↓
Problem
  ↓
Diagnosis
  ↓
Design
  ↓
Actions / Do
  ↓
Outcome
  ↓
Pain / Surprise
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
  → shared Goal / observed Reality
  → Issues / Problems / Disagreements
  → Diagnosis
  → governed machine Design
  → accountable execution
  → Outcome / Reflection / Principle
```

The product is not a generic task manager, OKR app, journal, CRM, HR suite, employee-ranking system, personality profiler, analytics dashboard, decision-only app, multi-agent Council or thinker simulator.

## 2. Philosophical / truth invariants

- Dream / desired Reality defines what matters; actual Reality informs the path.
- Goal, Problem, Diagnosis, Design, Action and Outcome remain distinct.
- Action completion is not evidence that the Design worked; Outcome requires observed Reality.
- Evidence/Observation are not the same as inference.
- AI output is never accepted truth solely because AI produced it.
- Pain/Outcome + Reflection should feed learning and future machine changes.
- Reflection may produce no Principle when evidence is insufficient.
- Principles remain revisable hypotheses to test, not immutable rules.
- Self Model means evidence-backed, user-correctable Pattern hypotheses — not fixed identity labels.
- Radical Transparency requires attribution and inspectable evidence; it does not override authorization.
- Believability is contextual track-record evidence, not a global score or fixed judgment about a person.
- Product UI should present current Reality and the next meaningful action before exposing internal ontology.

## 3. Implemented product

### Phase 1 — Secure Platform + Durable Kernel — Complete

First-party identity/session, owned Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, durable usage controls, checksum migrations, DB health, authenticated knowledge retrieval, live search, AI generation, safe client evidence projection and deployment safety foundations.

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

Longitudinal learning uses bounded Workspace-scoped private history, ephemeral model-facing keys, correctable Pattern hypotheses and explicit Principle revision. A revised Principle returns to testing, never automatically trusted.

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
- authenticated sparse Organization surface;
- authenticated user can create an Organization Workspace and becomes owner;
- safe `org_...` handles are used instead of exposing Workspace UUIDs to the browser;
- owner controls members, roles, responsibilities, role assignments, teams and team assignments;
- ordinary members are blocked from structural writes by server authorization;
- cross-organization structural references are rejected by PostgreSQL constraints;
- members can record attributable Issues, Disagreements and contextual track-record evidence;
- contextual evidence never becomes a global score, ranking, personality label or fixed identity judgment;
- Personal Workspace, People, Knowledge and Learning retain their personal behavior.

### Phase 6 — Product Recenter / Evolution Engine — In progress

The explicit Phase 6 product decision is to stop treating Goal, Reality, Problem, Execution, Reflection, Knowledge and Learning as loosely adjacent features and orchestrate them as one evolution system.

The first implementation tranche establishes the contract and a read-only projection without changing durable production data:

```text
PeopleState + ExecutionState
            ↓
    projectEvolutionState()
            ↓
       EvolutionState
```

`EvolutionState` exposes the active personal lineage:

```text
Dream
Reality
Problem / Gap
Diagnosis
Design
Actions
Outcome
Reflection
Principle
5-Step position
attention
next action
```

The projection composes existing repositories and safe client projections. No `evolution_cycles` table or destructive migration is introduced in the foundation tranche.

An authenticated read-only `GET /api/evolution/state` provides the projection for later People/UI recenter work.

See `docs/product/PHASE_6_ARCHITECTURE.md` for the locked goal, semantics and Definition of Done.

## 4. Reality / Learning Engine

```text
Shared Principles knowledge → RAG / retrieval ─┐
Current public reality → live search ──────────┤
Direct observations ───────────────────────────┤→ Evidence / history → Principles reasoning
Recorded Outcomes ─────────────────────────────┤
Completed Reflections / Principles ────────────┘

Organization members
  → Issues / Disagreements / contextual evidence
  → inspectable collective reality + governance
```

Public live search receives only the public query, never private personal-history excerpts. Longitudinal Learning AI works only with authenticated Workspace-scoped personal history server-side. Shared knowledge access does not make Personal Workspace state shared.

## 5. Production architecture baseline

Production runtime is self-contained after build:

- pnpm/Corepack are build/CI concerns, not runtime dependencies;
- database migrations run as `node scripts/migrate.mjs` on the internal-only data network;
- Next runs from standalone output via `node server.js` with `HOSTNAME=0.0.0.0`;
- pre-migration database backup, canary health/smoke, exact-SHA public health verification and zero-downtime swap remain deployment gates.

Phase 6 must preserve all existing production gates. The foundation tranche is read-only at the domain level and introduces no migration.

## 6. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Authenticated primary navigation is:

```text
People · Organization · Knowledge · Learning
```

Phase 6 UI direction:

- People becomes the primary personal evolution surface: Dream / Reality / Gap / current 5-Step / next action;
- Organization applies the same kernel to the collective machine;
- Knowledge becomes a way to think from Principles and evidence rather than an isolated generic chat mental model;
- Learning becomes the longitudinal view of Patterns, unresolved Reflection opportunities and living Principles;
- 5 Steps are the visible execution backbone, not decorative progress labels;
- Pain + Reflection becomes a central learning interaction;
- Principles should visibly behave as living hypotheses under test;
- no scorecards, employee rankings, trait radar, streaks, gamification or analytics dashboard;
- progressive disclosure remains the default for evidence, uncertainty and history.

## 7. Phase progress

| Phase | Name | Status | Actual / target outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product philosophy, language and governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine change → Actions → Outcome → Review works durably. |
| 4 | Learning Engine + Self Model | **Complete** | History yields inspectable/correctable Pattern hypotheses and can revise a Principle back into testing. |
| 5 | Principles for Organizations | **Complete** | A governed collective machine can make structure, issues, disagreement and contextual track record explicit without people scoring. |
| 6 | Product Recenter / Evolution Engine | **In progress** | Recenter the product around Dream + Reality + Determination, 5 Steps, and Pain + Reflection → Progress using the proven durable kernel. |

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

## 9. Phase 5 verification

Final pre-merge head: `424764e8855d37c4b961ab968386dc409e0d7b85`.

- Foundation #189 ✅ — PostgreSQL 16, migrations 0001–0005, typecheck, unit tests, real-Postgres integration tests and production build;
- Lint #524 ✅;
- Playwright #291 ✅.

Post-merge main `0fa12577636715437f3208e8289d71931433aa61`:

- Foundation #190 ✅;
- Lint #525 ✅;
- Playwright #292 ✅;
- production deploy run `32844721161` ✅;
- migration `0005_organizations.sql` applied on production ✅;
- canary, public exact-SHA health and zero-downtime swap ✅.

## 10. Phase 6 acceptance boundary

Phase 6 is not Complete because an architecture document or redesigned screen exists.

Completion requires the full recentered loop to work end-to-end:

```text
Dream
  → Reality
  → Problem
  → Diagnosis
  → Design
  → Do
  → Outcome
  → Reflection
  → Principle
  → Reality again
```

Required properties:

- existing user history projects without re-entry;
- current state and next action are explicit;
- 5 Steps are semantically enforced;
- Outcome remains observed Reality, never inferred from task completion;
- Pain/Outcome can trigger Reflection;
- Reflection can yield no Principle when evidence is insufficient;
- Principle lifecycle remains user-reviewed and revisable;
- Knowledge cannot silently write durable personal state;
- Organization reuses the same kernel rather than duplicating a separate product ontology;
- authorization, provenance, privacy projections and production gates remain intact.

## 11. Known limitations / work remaining in Phase 6

The foundation tranche does not yet:

- replace the existing People UI with the Evolution experience;
- make Diagnosis → Design → Do the primary visible People flow;
- redesign Pain + Reflection interactions;
- expose living Principle test evidence in the UI;
- recenter Learning around Patterns / Reflection / Principles under test;
- recenter Knowledge around Principles-aware contextual actions;
- recenter Organization around the same complete evolution loop;
- add explicit durable Principle test-event semantics.

Existing platform/Phase 5 limitations not directly addressed by Phase 6 remain unless explicitly pulled into a later tranche.

## 12. Next boundary

**Phase 6 is explicitly defined and in progress.**

Do not infer a Phase 7 from this work. The next major phase after Phase 6 requires a separate explicit product decision.

The implementation order is:

```text
contract + EvolutionState projection
  → People recenter
  → 5 Steps completion
  → Pain + Reflection
  → Living Principles
  → Learning recenter
  → Knowledge recenter
  → Organization recenter
  → mobile/accessibility audit
  → production verification
  → Phase 6 closeout
```

## 13. Retired architecture

Do not restore without an explicit product decision: Thinker Machine, Council/Council agents, Brain models, historical-thinker personas, Principles Graph/constellation, Decision Workspace/Brief/Run and old V2 route/contracts.

## 14. Contributor rule

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

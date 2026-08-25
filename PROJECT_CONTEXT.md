# PROJECT CONTEXT — Principles

**Status:** Phase 4 — Learning Engine + Self Model — **Ready, not merged**  
**Effective date:** 2026-08-24  
**Completed on `main`:** Phases 0–3  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
**Phase 4 branch:** `phase/4-learning-self-model`  
**Next after Phase 4 merge:** Phase 5 — Principles for Organizations — Planned

This file is the source of truth for current product direction, architecture, progress and boundaries on this branch. Phase 4 is verified but is not yet part of `main`.

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

### Phase 1 — Secure Platform + Durable Kernel — Complete on `main`

First-party identity/session, owned Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, durable usage controls, checksum migrations, DB health, authenticated RAGFlow, Brave live search + DeepSeek, safe client evidence projection and deployment safety foundations.

### Phase 2 — First People learning loop — Complete on `main`

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal meaning stays richer than KPI CRUD; Reality is Goal-scoped; Problems and Principles remain user-reviewed; Reflection is progressive; accepted Principles enter `testing`, never automatically `trusted`.

### Phase 3 — Design + Execution — Complete on `main`

```text
Problem → Diagnosis → Design → Actions → Outcome → Review / Reflection
```

Diagnosis separates symptom/proximate/root-cause hypotheses and preserves evidence for/against, alternatives and uncertainty. Design is a machine change with expected result and success signal. Actions only execute Design. Outcome compares expected versus actual Reality, creates Evidence + Observation atomically, evaluates the Design only after Reality is observed, and feeds a linked post-Outcome Reflection.

### Phase 4 — Learning Engine + Self Model — Ready on branch

```text
Durable history
  → Learning Pattern proposal
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → testing again
```

Implemented:

- authenticated sparse `/learning` surface;
- no pattern-generation action until at least two completed Reflections exist;
- Pattern kinds: recurring pattern, Design learning, Principle effectiveness and constraint hypothesis;
- AI receives bounded private case summaries via ephemeral `C#` keys and Principle summaries via `P#` keys, not durable UUIDs;
- proposal uses the 8 most recent completed Reflections, presented chronologically, with bounded model-facing excerpts;
- unknown/duplicate case keys and unknown Principle keys are rejected;
- `recurring_pattern` requires at least two distinct Problems in both AI resolution and deferred PostgreSQL semantics;
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

Public live search receives only the public query, never private RAG excerpts. Phase 4 longitudinal AI works only with authenticated Workspace-scoped private history server-side.

## 5. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

People and Knowledge remain primary existing surfaces; Learning is a sparse secondary surface. Pattern evidence and uncertainty use progressive disclosure. No scorecards, trait radar, streaks or insight feed were introduced.

## 6. Phase progress

| Phase | Name | Status | Actual / expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product philosophy, language and governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine change → Actions → Outcome → Review works and is merged. |
| 4 | Learning Engine + Self Model | **Ready** | History now yields inspectable/correctable Pattern hypotheses and can revise a Principle back into testing. |
| 5 | Principles for Organizations | Planned | Extend the proven People kernel to collective machines with governance and permissions. |

## 7. Phase 4 audit / verification

The self-reinforcing loop corrected:

- TypeScript ephemeral-key inference without weakening runtime validation;
- a semantic bypass where a client could relabel same-Problem cases as `recurring_pattern` after AI validation — now blocked by deferred PostgreSQL constraints and real-Postgres tests;
- history selection that would eventually favor old Reflection rows — proposals now use the 8 most recent completed cases;
- unbounded model-facing historical text — case/Principle excerpts are bounded.

Final runtime head before documentation closeout: `4ae0d5cefc51b8137f943720f68bbac86175ac30`.

- Foundation #163 ✅ — PostgreSQL 16, migrations 0001–0004, typecheck, unit tests, serial real-Postgres integration tests, production build;
- Lint #498 ✅;
- Playwright #265 ✅ — authentication/insufficient-history boundary, full Phase 2 + 3 + 4 browser path, Pattern correction, Principle revision/reload/rejection, Knowledge privacy and normal scrolling.

**Expected outcome achieved on the branch:** Principles can compound value from a real person's own durable history without pretending the resulting Pattern is fixed truth about the person.

## 8. Known limitations after Phase 4

- Phase 4 is not merged to `main` yet.
- Pattern discovery is manual/user-triggered; no scheduled/proactive learning jobs.
- Each proposal considers the 8 most recent completed Reflection cases, not semantic retrieval over unlimited personal history.
- One Pattern drives at most one Principle revision in v1.
- `/learning` is a secondary page rather than a shared live state store with People.
- No personality testing/psychometric score/clinical inference product.
- No generic conversation memory, notifications, organization collaboration or structured business connectors.
- Existing platform gaps such as password recovery and automated off-host restore remain.

## 9. Next boundary

**Phase 5 — Principles for Organizations remains Planned.** Do not begin it from this branch unless Phase 4 is explicitly merged/accepted first.

Phase 5 may add Organization Workspaces, people/roles/responsibilities/teams, culture signals, disagreement, permissions/governance and contextual evidence-backed believability. It must preserve the People kernel, privacy boundaries and user-correctable inference model.

## 10. Retired architecture

Do not restore without an explicit product decision: Thinker Machine, Council/Council agents, Brain models, historical-thinker personas, Principles Graph/constellation, Decision Workspace/Brief/Run and old V2 route/contracts.

## 11. Contributor rule

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

For this Phase 4 request, merge was intentionally omitted. Phase 4 therefore remains **Ready**, not Complete, until a later explicit merge instruction.

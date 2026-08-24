# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24  
**Merged baseline:** Phases 0–2 Complete  
**Current ready phase:** Phase 3 — Design + Execution — PR #57  
**Next after Phase 3 merge:** Phase 4 — Learning Engine + Self Model — Planned

A phase is not Complete because code exists. It becomes Complete only after the intended behavior works, boundaries are verified, actual outcome is recorded and the work is merged.

## Phase execution protocol

```text
Understand requirements
  → define acceptance criteria
  → implement
  → audit
  → fix
  → re-audit
  → final output check
  → merge
  → report
```

Closeout records scope delivered, Definition of Done result, expected versus actual outcome, verification evidence, known limitations and next-phase boundary.

## Progress states

- **Planned** — defined but not started.
- **Active** — current major implementation focus.
- **Ready** — implementation/re-audit complete on a branch and awaiting final verification/merge.
- **Complete** — merged and source-of-truth updated with actual outcome.
- **Blocked** — cannot responsibly continue without a named dependency/decision.

## Program view

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A user safely owns durable private Principles state with provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle produces durable user-owned learning. |
| 3 | Design + Execution | **Ready** | Diagnosis → machine Design → Actions → Outcome → Review works end-to-end and passes re-audit; awaiting merge. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces useful, correctable patterns and improving Principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports collective people/culture machines, governance and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

Established the Principles Kernel, Goal as chosen desired Reality rather than KPI CRUD, Evidence/interpretation distinction, Problem/Diagnosis/Design/Outcome/Reflection/Principle language, person/organization as redesignable machines, AI roles, People-first thesis, minimal UI and phase governance.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Delivered identity/session, owned Personal Workspace, PostgreSQL 16, workspace isolation/provenance, Activity Events, AI Suggestions, RAGFlow bindings, authenticated Knowledge Q&A, Brave + DeepSeek, provider controls, client evidence projection and migration/health/canary/rollback foundations.

**Actual outcome:** Principles can safely own private durable state and run retrieval/AI behind an authenticated Workspace boundary.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Complete  
**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

Delivered:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Goal Discovery is progressive; measures are optional. Direct Reality persists Evidence + accepted Observation atomically and is Goal-scoped. Problems are AI-assisted but user-confirmed. Reflection is progressive and linked to matching Goal + Problem. Principle candidates retain provenance, can be accepted to testing/rejected/revised and cannot become trusted automatically.

Final pre-merge verification: Foundation #135 ✅, Lint #470 ✅, Playwright #237 ✅.

**Actual outcome:** Principles accumulates one coherent unit of user-owned learning instead of resetting to stateless Q&A.

---

# Phase 3 — Design + Execution

**Status:** **Ready on PR #57**

## Objective

Continue the 5-Step Process from recognized Problem to changed machine and observed Reality:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

## Delivered

### Diagnosis

- user-reviewed cause-and-effect hypothesis;
- symptom, proximate cause and root-cause hypothesis remain separate;
- supporting/contradicting evidence, alternatives, uncertainty and optional confidence;
- AI explicitly prohibited from jumping to remedy/task;
- accepted/revised semantics with server-side AI provenance;
- replay and tenant/semantic constraints.

### Design

- machine change, cause-and-effect rationale, expected result and success signal;
- user confirmation/revision;
- 1–5 Actions persisted atomically with the Design;
- no generic Projects/kanban/assignment/sprint model.

### Execution

- only pending/completed/cancelled Actions required by the Design;
- completion timestamps are durable;
- Action completion alone leaves Design `active`;
- Action mutation is blocked after Design evaluation.

### Outcome

- cannot be recorded while Actions remain pending;
- atomically creates Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- stores expected snapshot, actual result and user comparison (`improved | mixed | worse | unclear`);
- matching Workspace + Goal + Problem + Diagnosis + Design chain enforced;
- one Outcome per Design in Phase 3 v1;
- valid Outcome changes Design lifecycle to `evaluated`.

### Review

- one short prompt at a time;
- expected/actual context inherited from Outcome;
- completed Reflection linked to matching Outcome + Goal + Problem;
- ready as longitudinal evidence for Phase 4.

### UI

Once Phase 2 learning is reviewed, the change loop is:

```text
Diagnose → Design → Do → Outcome → Review
```

The root-cause hypothesis/machine change are primary; evidence, alternatives and uncertainty use progressive disclosure. No dashboard filler or generic task-management shell was introduced.

## Audit findings corrected

- async UI context narrowing/type failure;
- E2E locator tied to duplicate Outcome text;
- missing cross-workspace Design/Outcome proof;
- missing Design revision proof;
- Action completion versus Design-success ambiguity;
- Action mutability after evaluation;
- multiple Outcomes per Design;
- stale pending AI proposals after retries;
- unstable editable Action React keys.

## Re-audit result

Code head `3d590dd05cc4faa21fa9629f57060a9edac57b87` passed:

- Foundation #149 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit, serial real-Postgres integration, production build;
- Playwright #251 ✅ — full Phase 2 + Phase 3 browser loop through Outcome Review and reload;
- Lint #484 ✅.

A final gate will run on the documentation closeout head before merge.

## Expected versus actual outcome

**Expected:** one meaningful Problem can become a reviewed root-cause hypothesis, a machine change, execution, observed Outcome and new Reflection.

**Actual:** achieved on PR #57. Principles no longer treats task completion as success; actual Reality must be observed before the Design is evaluated.

## Known limitations

- Phase 3 activation follows a normal server render/navigation after the Phase 2 Principle is reviewed; no shared live client state across the two surfaces yet;
- one v1 execution chain is surfaced for the selected Goal/Problem;
- one Outcome per Design;
- no generic Projects, assignment, recurrence, reminders or scheduling;
- no longitudinal Self Model/pattern engine yet;
- no Organization collaboration or structured business connectors.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned — not started

Use longitudinal evidence from Goals, Problems, Diagnoses, Designs, Actions, Outcomes, Reflections and Principles to detect/test:

- recurring Problems/Pain;
- repeated 5-Step failure points;
- stated priorities versus observed behavior;
- recurring diagnosis/design failures;
- Principle effectiveness;
- evolving strength/constraint hypotheses.

Every pattern must remain evidence-backed, inspectable and correctable.

**Definition of Done:** Principles surfaces at least one useful longitudinal pattern that the user can trace to cases, correct if wrong and use to change future behavior or a Principle.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven People kernel with Organization Workspace, people/roles/responsibilities/teams, culture signals, issues/disagreements, governance and domain-specific evidence-backed believability. Radical Transparency must coexist with permissions/accountability.

---

# Cross-phase invariants

All future phases preserve:

- authorization before private retrieval/AI;
- evidence/provenance boundaries;
- observation ≠ inference;
- AI suggestion ≠ truth;
- public live search never receives private RAG excerpts;
- minimal UI without explanatory filler;
- database-level tenant/semantic invariants where practical;
- no resurrection of retired Council/V2 architecture without an explicit decision.

# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24  
**Current completed baseline:** Phases 0–3  
**Next phase:** Phase 4 — Learning Engine + Self Model — Planned

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

A phase becomes Complete only after behavior works, required boundaries are verified, actual outcome/limitations are recorded and the work is merged.

## Program view

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Safe durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle produces durable user-owned learning. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → Outcome → Review turns learning into observed machine change. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces useful, correctable patterns and improving Principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports collective people/culture machines, governance and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

Established the Principles Kernel, Goal as chosen desired Reality rather than KPI CRUD, Evidence/interpretation distinction, Problem/Diagnosis/Design/Outcome/Reflection/Principle language, people/organizations as redesignable machines, AI roles, People-first thesis, minimal UI and sequential phase governance.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Delivered identity/session, Personal Workspace, PostgreSQL 16, isolation/provenance, Activity Events, AI Suggestions, RAGFlow, authenticated Knowledge Q&A, Brave + DeepSeek, provider controls, safe client projection and migration/health/deployment safety foundations.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Complete  
**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal Discovery is progressive and measures are optional. Reality persists atomic Goal-scoped Evidence + Observation. Problems are AI-assisted/user-confirmed. Reflection is structured. Principle candidates retain provenance and accept→testing/reject/revise semantics; no automatic trusted state.

Final pre-merge verification: Foundation #135 ✅, Lint #470 ✅, Playwright #237 ✅.

---

# Phase 3 — Design + Execution

**Status:** Complete  
**Merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`

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
- symptom, proximate cause and root-cause hypothesis separated;
- supporting/contradicting evidence, alternatives, uncertainty, optional confidence;
- AI explicitly prohibited from jumping to remedy/task;
- accepted/revised semantics with provenance/replay constraints.

### Design

- machine change, rationale, expected result and success signal;
- user confirmation/revision;
- 1–5 Actions persisted atomically with Design;
- no generic Projects/kanban/assignment/sprint model.

### Execution

- pending/completed/cancelled Actions;
- completion timestamps;
- completed Actions alone leave Design `active`;
- evaluated Design Actions are immutable.

### Outcome

- blocked while Actions remain pending;
- atomic Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- expected snapshot, actual result and user comparison (`improved | mixed | worse | unclear`);
- same Workspace + Goal + Problem + Diagnosis + Design chain enforced;
- one Outcome per Design in v1;
- valid Outcome changes Design to `evaluated`.

### Review

- one short prompt at a time;
- expected/actual context inherited from Outcome;
- completed Reflection linked to matching Outcome + Goal + Problem.

### UI

```text
Diagnose → Design → Do → Outcome → Review
```

Root-cause hypothesis/machine change are primary; evidence, alternatives and uncertainty use progressive disclosure. No dashboard filler or generic task-management shell.

## Audit findings corrected

- async UI type narrowing;
- duplicate-text E2E locator coupling;
- missing cross-workspace Design/Outcome proof;
- missing Design revision proof;
- Action completion vs success ambiguity;
- Action mutation after evaluation;
- multiple Outcomes per Design;
- stale pending AI proposals on retry;
- unstable editable Action keys.

## Final verification

Pre-merge head `175968077c26c38a7c47a21345737d592d238507`:

- Foundation #154 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit, serial real-Postgres integration, production build;
- Playwright #256 ✅ — full Phase 2 + Phase 3 browser loop through Outcome Review and reload;
- Lint #489 ✅.

## Expected versus actual outcome

**Expected:** one meaningful Problem becomes a reviewed root-cause hypothesis, machine change, execution, observed Outcome and new Reflection.

**Actual:** achieved and merged. Principles no longer treats task completion as success; actual Reality must be observed before the Design is evaluated.

## Known limitations

- normal server render/navigation currently bridges reviewed Phase 2 Principle to Phase 3 surface;
- one surfaced v1 execution chain for the selected Goal/Problem;
- one Outcome per Design;
- no generic Projects/assignment/recurrence/reminders/scheduling;
- no longitudinal Self Model/pattern engine yet;
- no Organization collaboration or structured business connectors.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned — not started

Use longitudinal Goals, Problems, Diagnoses, Designs, Actions, Outcomes, Reflections and Principles to detect/test:

- recurring Problems/Pain;
- repeated 5-Step failure points;
- stated priorities versus observed behavior;
- recurring diagnosis/design failures;
- Principle effectiveness;
- evolving strength/constraint hypotheses.

Every inferred pattern must remain evidence-backed, inspectable and correctable.

**Definition of Done:** Principles surfaces at least one useful longitudinal pattern that the user can trace to cases, correct if wrong and use to change future behavior or a Principle.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven People kernel with Organization Workspace, people/roles/responsibilities/teams, culture signals, issues/disagreements, governance and domain-specific evidence-backed believability. Radical Transparency must coexist with permissions/accountability.

---

# Cross-phase invariants

- authorization before private retrieval/AI;
- evidence/provenance boundaries;
- observation ≠ inference;
- AI suggestion ≠ truth;
- public live search never receives private RAG excerpts;
- minimal UI without explanatory filler;
- database tenant/semantic invariants where practical;
- no resurrection of retired Council/V2 architecture without explicit product decision.

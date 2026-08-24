# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24  
**Current completed baseline:** Phases 0–2  
**Next phase:** Phase 3 — Design + Execution — Planned

This plan converts the Principles Kernel into sequential major product outcomes. A phase is not Complete because code exists; it is Complete only after the behavior works, boundaries are verified, actual outcome is recorded and the work is merged.

## Phase execution protocol

Every phase follows:

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

Phase closeout must record:

- scope actually delivered;
- Definition of Done result;
- expected outcome;
- actual outcome;
- verification evidence;
- known limitations;
- next-phase boundary.

## Progress states

- **Planned** — defined but not started.
- **Active** — current major implementation focus.
- **Ready** — implementation/re-audit complete on a branch and awaiting merge.
- **Complete** — merged and source-of-truth updated with actual outcome.
- **Blocked** — cannot responsibly proceed without a named dependency or decision.

## Program view

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A user safely owns durable private Principles state with provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | One person completes Goal → Reality → Problem → Reflection → Principle and preserves the learning durably. |
| 3 | Design + Execution | Planned | A diagnosed problem changes the personal machine through design, action, outcome and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces useful, correctable patterns and improving principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports collective people/culture machines, governance and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

## Objective

Prevent Principles from becoming conventional productivity software with Ray Dalio terminology layered on top.

## Delivered

- Principles Kernel specification;
- Goal as chosen desired reality rather than KPI CRUD;
- Reality/evidence distinction;
- Problem / Diagnosis / Design / Outcome / Reflection / Principle definitions;
- person and organization as machines that can be observed and redesigned;
- AI roles: Observe, Challenge, Diagnose, Design, Reflect;
- People-first / Organizations-later thesis;
- minimal UI principles;
- no-filler-microcopy constraint;
- sequential phase governance.

## Actual outcome

Engineering and AI contributors have one explicit product model and no longer inherit the retired Council/V2 architecture as implicit requirements.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

## Objective

Create the smallest secure substrate on which personal Principles state can exist safely and durably.

## Delivered

- first-party email/password identity;
- scrypt password storage and opaque hashed sessions;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- checksum-bound additive migrations;
- workspace as authorization/retrieval/quota boundary;
- database-level cross-workspace provenance constraints;
- Goal/Evidence/Observation/Reflection/Principle foundations;
- AI Suggestions with acceptance state;
- Activity Events;
- workspace-scoped RAGFlow bindings;
- authenticated hybrid Knowledge Q&A;
- Brave live search + DeepSeek synthesis;
- safe client evidence projection;
- durable auth/provider usage controls;
- DB-aware health, pre-migration snapshots, canary and rollback foundations;
- real-Postgres integration and browser tests.

## Expected outcome

Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

## Actual outcome

Achieved and merged. Security/audit work corrected session ownership ambiguity, proxy/rate-limit scope, evidence leakage, cross-workspace provenance, migration drift, malformed cookies, bootstrap behavior and CI/PostgreSQL assumptions before merge.

## Limitations carried forward

- no password reset/email verification/OAuth/passkeys;
- no organization workspace product;
- no longitudinal self-model;
- no structured business connectors;
- no scheduled/off-host DB backup/restore automation.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Complete  
**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

## Objective

Prove that Principles is an evolution system rather than only an authenticated knowledge assistant.

## Delivered loop

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

## Goal Discovery — achieved

- Goal remains a chosen desired reality, not KPI CRUD;
- progressive one-question-at-a-time interaction;
- desired state, why, success conditions, trade-offs and non-negotiables;
- optional measures;
- deterministic fallback when provider work is unavailable;
- provider call skipped when required discovery is already complete.

## Reality — achieved

- direct user Reality statement creates durable Evidence + accepted Observation atomically;
- Observation is explicitly tied to Goal;
- evidence/internal workspace identifiers are removed from browser state;
- private RAG/live search remain separate authenticated Knowledge capabilities.

## Problem — achieved

- Problem is explicitly tied to Goal;
- AI proposal is constrained to selected Goal + Reality and remains only a proposal;
- user can confirm/edit before durable creation;
- selected evidence provenance is retained;
- cross-workspace and AI-suggestion replay constraints are enforced.

## Reflection — achieved

Progressive prompts cover:

```text
What happened?
What did you expect?
What surprised or hurt?
Is this recurring?
What might this teach you?
```

Reflection links to both Goal and Problem. The DB ensures the Problem belongs to the same Goal, not only the same workspace.

## Principle candidate — achieved

A Principle candidate retains:

- trigger;
- rule;
- rationale;
- optional confidence;
- Reflection origin;
- evidence provenance;
- explicit acceptance state.

Lifecycle:

```text
AI candidate
  → pending / candidate
  → accept → testing
  → reject
  → revise
```

No Phase 2 path can automatically create a trusted Principle.

## UI — achieved

Authenticated root is organized around:

```text
Goal → Reality → Problem → Reflect → Principle
```

Knowledge Q&A remains secondary at `/knowledge`. No Phase 3 dashboard/task shell was added.

## Audit findings corrected

The self-reinforcing audit loop corrected:

- composite-FK semantics;
- Evidence UUID exposure;
- one suggestion producing multiple durable rows;
- Reality not tied to Goal;
- optional measures acting like required KPI fields;
- Goal/Reality semantic mismatch;
- non-atomic Principle persistence;
- same-workspace wrong-Goal Reflection linkage;
- integration test races from destructive shared setup;
- missing reject/revise/trusted-prevention verification.

## Final verification before merge

After Phase 1 was merged, Phase 2 was re-parented onto the real `main` Phase 1 commit, retargeted to `main`, stacked-only CI triggers were removed, and the main-target head passed:

- Foundation #135 ✅
- Lint #470 ✅
- Playwright #237 ✅

## Expected outcome

Principles begins accumulating coherent, user-owned learning instead of only answering questions.

## Actual outcome

Achieved and merged. A real browser flow can complete Goal → Reality → Problem → Reflection → Principle, explicitly place a candidate into testing, reload and recover the durable state. PostgreSQL integration tests prove isolation, semantic consistency, replay protection and rollback behavior.

## Limitations carried forward

Phase 2 intentionally does not implement:

- Diagnosis;
- machine Design;
- Actions/Projects;
- Outcome comparison;
- longitudinal pattern learning;
- Organization collaboration.

---

# Phase 3 — Design + Execution

**Status:** Planned

## Objective

Continue the 5-Step Process from recognized Problem to changed machine and observed Outcome.

Target loop:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

## Required product distinctions

### Diagnosis

Must distinguish:

- symptom;
- proximate cause;
- root-cause hypothesis;
- evidence supporting/contradicting the hypothesis;
- uncertainty.

Do not jump from Problem directly to task creation.

### Design

A Design represents a proposed change to the machine producing the outcome. It is not merely a checklist.

### Actions

Actions/tasks exist to execute a Design. Add only the execution primitives required by the loop; do not become an Asana/Jira clone.

### Outcome

Record expected versus actual Reality so the design can be evaluated rather than marked successful because tasks were completed.

### Review / Reflection

Observed Outcome must feed back into Reflection and future Principle evidence.

## UI direction

A sparse Today/attention surface may become useful here, but it should show only the few items that truly require attention.

## Definition of Done

A person can take one meaningful recognized Problem, diagnose a root-cause hypothesis, design a machine change, execute the necessary actions, record an Outcome and compare it with the expected result.

## Expected outcome

Principles turns learning into changed behavior/system and observes whether the machine actually improved.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned

## Objective

Use longitudinal evidence to make Principles more useful over time.

Potential capabilities:

- repeated Problem/Pain detection;
- 5-Step failure-pattern analysis;
- stated-priority versus observed-behavior tensions;
- Principle effectiveness;
- recurring diagnosis/design failures;
- evolving strength/constraint hypotheses.

Every pattern must remain evidence-backed, inspectable and correctable.

## Definition of Done

Principles surfaces at least one useful longitudinal pattern that the user can trace to cases, correct if wrong and use to change future behavior or a Principle.

## Expected outcome

Compounding value from the person's own history.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

## Objective

Extend the proven People kernel to a collective machine without weakening privacy, governance or truth-seeking.

New dimensions may include:

- Organization Workspace;
- people / roles / responsibilities / teams;
- culture signals;
- issues / disagreements;
- decision rights and governance;
- domain-specific believability.

Believability is contextual and evidence-backed, never a global human-worth score. Radical Transparency must coexist with permissions and accountability.

## Definition of Done

A small real team can share a Goal, surface a meaningful Problem/disagreement, inspect permitted evidence, diagnose and design a machine change, observe an Outcome, reflect and update an organizational Principle.

## Expected outcome

A collective evolution system built on the same kernel proven for individuals.

---

# Cross-phase invariants

All future phases must preserve:

- workspace authorization before private retrieval/AI work;
- evidence/provenance boundaries;
- explicit distinction between observation and inference;
- AI suggestions are not automatically truth;
- public live search never receives private RAG excerpts;
- minimal UI without explanatory microcopy filler;
- database-level tenant invariants where practical;
- no resurrection of retired Council/V2 architecture without explicit product decision.

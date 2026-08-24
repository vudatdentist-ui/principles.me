# PROJECT CONTEXT — Principles

**Status:** Phase 3 — Design + Execution — **Complete**  
**Effective date:** 2026-08-24  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
**Next major phase:** Phase 4 — Learning Engine + Self Model — Planned

This file is the source of truth for current product direction, architecture, progress and boundaries. If older issues, branches, deleted V2 artifacts or prior chats conflict with this file, this file wins until deliberately updated.

Read with:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_1_OPERATIONS.md`
- `docs/product/PHASE_2_ARCHITECTURE.md`
- `docs/product/PHASE_3_ARCHITECTURE.md`

## 1. Product mission

Principles is an **evolution system for people first and organizations second**.

```text
What do I truly want?
        ↓
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
      Evolve
        ↺
```

The product is not a generic task manager, OKR app, journal, CRM, decision-only app, multi-agent Council, thinker simulator or chatbot with Ray Dalio terminology layered on top.

## 2. Philosophical core

### Dreams + Reality + Determination

Desired Reality defines what matters. Actual Reality informs the path without automatically shrinking the Dream. Determination is expressed through disciplined execution of a designed machine change.

### The 5-Step Process

```text
Goal
  ↓
Identify Problems
  ↓
Diagnose Root Causes
  ↓
Design the Machine
  ↓
Push Through to Results
```

Problem, Diagnosis, Design, Action and Outcome remain distinct durable concepts.

### Pain + Reflection = Progress

```text
experience / outcome
  → discrepancy
  → reflection
  → lesson
  → principle
  → machine change
  → new reality
  ↺
```

Supporting mechanisms include Radical Truth, Radical Open-Mindedness, evidence/provenance, higher-level machine thinking and revisable Principles.

## 3. Truth and Reality model

```text
SOURCE / EVENT
      ↓
   EVIDENCE
      ↓
 OBSERVATION
      ├────→ BELIEF
      └────→ HYPOTHESIS
                 ↓
             DIAGNOSIS
```

AI suggestions never become accepted truth solely because AI produced them. Important AI-derived durable state retains provenance and explicit user acceptance/revision/rejection semantics.

## 4. Current implemented platform

### Phase 1 — Secure Platform + Durable Kernel — Complete

Implemented:

- first-party identity/session;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- workspace authorization/provenance constraints;
- Activity Events and AI Suggestions;
- durable auth/provider usage limits;
- checksum-bound migrations and DB-aware health;
- workspace-scoped RAGFlow retrieval;
- Brave live public search + DeepSeek synthesis;
- safe browser evidence projection;
- production DB/canary/rollback foundations.

### Phase 2 — Principles for People: First Complete Learning Loop — Complete

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Implemented progressive Goal Discovery, Goal-scoped Reality as atomic Evidence + Observation, user-confirmed Problems, progressive Reflection, revisable Principle candidates, accept→testing/reject/revise semantics, tenant/semantic constraints and secondary `/knowledge` Reality Q&A.

### Phase 3 — Design + Execution — Complete

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Implemented:

- Diagnosis that separates symptom, proximate cause and root-cause hypothesis;
- supporting/contradicting evidence, alternatives, uncertainty and optional confidence;
- user-confirmed/revised Diagnosis with server-side AI provenance;
- Design centered on machine change, rationale, expected result and success signal;
- 1–5 minimal Actions persisted atomically with Design;
- durable pending/completed/cancelled Action execution;
- Outcome blocked while Actions remain pending;
- Action completion alone never marks a Design successful;
- atomic Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- user comparison `improved | mixed | worse | unclear`;
- one Outcome per Design in Phase 3 v1;
- evaluated Design Actions become immutable;
- post-Outcome Review stored as Reflection linked to matching Outcome/Goal/Problem;
- stale pending Diagnosis/Design proposals superseded on retry;
- browser projection excludes Workspace IDs, Evidence UUIDs and AI provenance IDs.

The sparse change UI is:

```text
Diagnose → Design → Do → Outcome → Review
```

## 5. Reality Engine

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ Evidence → Principles reasoning
Direct user observations ───────────────┤
Recorded Outcomes ──────────────────────┘
```

Public live search receives only the public query, never private RAG excerpts.

## 6. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer one primary next action, compact completed state, progressive disclosure for evidence/uncertainty and empty space when nothing more deserves attention.

## 7. Phase progress

| Phase | Name | Status | Actual outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Product philosophy, kernel language, UI rules and phase governance established. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works and survives reload. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → observed Outcome → Review works end-to-end and is merged. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal history produces evidence-backed, correctable patterns and improving Principles. |
| 5 | Principles for Organizations | Planned | The proven People kernel extends to collective people/culture machines, governance and domain-specific believability. |

## 8. Phase 3 verification/outcome

Final pre-merge head `175968077c26c38a7c47a21345737d592d238507` passed:

- Foundation #154 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit tests, serial real-Postgres integration tests, production build;
- Playwright #256 ✅ — authentication boundary, complete Phase 2 + Phase 3 browser path through Outcome Review and reload, safe Knowledge projection, normal scrolling;
- Lint #489 ✅.

Audit corrected async UI narrowing, duplicate-text E2E coupling, missing cross-workspace Design/Outcome proof, Design revision semantics, Action-completion-versus-success ambiguity, Action mutation after evaluation, multiple Outcomes per Design, stale pending proposals and unstable Action editor keys.

**Expected outcome achieved:** Principles now has a durable path from understanding → machine change → execution → observed Reality → Reflection, and does not treat completed work as proof that the Design succeeded.

## 9. Known limitations

- Phase 3 appears after a normal server render/navigation once the Phase 2 Principle is reviewed; the two client surfaces do not share one live state store yet;
- one v1 execution chain is surfaced for the selected Goal/Problem;
- one Outcome per Design;
- no generic Projects/kanban/assignment/recurrence/reminders/scheduling;
- no longitudinal Self Model/pattern learning yet;
- no Organization collaboration or structured business connectors;
- existing platform gaps such as password recovery and automated off-host restore remain.

## 10. Next phase

**Phase 4 — Learning Engine + Self Model is Planned and has not started.**

It may use longitudinal Goals, Problems, Diagnoses, Designs, Actions, Outcomes, Reflections and Principles to detect recurring patterns. Every inferred pattern must remain evidence-backed, inspectable and correctable rather than becoming a fixed personality label.

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
  → merge
  → report
```

A phase becomes Complete only after merge and source-of-truth closeout records actual outcome, limitations, verification and the next boundary.

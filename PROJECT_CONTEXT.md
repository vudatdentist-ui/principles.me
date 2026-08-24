# PROJECT CONTEXT — Principles

**Status:** Phase 3 — Design + Execution — **Ready on PR #57**  
**Effective date:** 2026-08-24  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Active Phase 3 branch:** `phase/3-design-execution`  
**Next major phase after merge:** Phase 4 — Learning Engine + Self Model — Planned

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

Its kernel is:

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

Desired Reality defines what matters. Actual Reality constrains and informs the path without automatically shrinking the Dream. Determination is expressed through disciplined execution of a designed machine change.

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

Principles distinguishes source data from interpretation:

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

Implemented on `main`:

- first-party email/password identity;
- scrypt password hashing and opaque hashed PostgreSQL sessions;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- workspace authorization/provenance constraints;
- Activity Events and AI Suggestions;
- durable auth/provider usage limits;
- checksum-bound migrations and DB-aware health;
- workspace-scoped RAGFlow retrieval;
- Brave live public search + DeepSeek synthesis;
- safe browser evidence projection;
- production database/canary/rollback foundations.

### Phase 2 — Principles for People: First Complete Learning Loop — Complete

Primary learning loop:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Implemented:

- one focused Goal Discovery question at a time;
- desired state, why, success conditions, trade-offs and non-negotiables;
- optional measures rather than KPI-first Goal modeling;
- Goal-scoped direct-user Reality as atomic Evidence + accepted Observation;
- AI Problem proposal constrained to selected Goal + Reality;
- explicit user confirmation/edit before Problem persistence;
- progressive Reflection linked to the matching Goal + Problem;
- AI Principle candidate with provenance;
- accept → testing, reject and revise paths;
- no automatic trusted Principle promotion;
- replay/cross-workspace/cross-Goal protections;
- Knowledge Q&A retained at `/knowledge` as a secondary Reality capability.

### Phase 3 — Design + Execution — Ready on PR #57

Phase 3 closes the execution side of the 5-Step Process:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Implemented on the Phase 3 branch:

- Diagnosis AI that separates symptom, proximate cause and root-cause hypothesis;
- supporting/contradicting evidence, alternatives, uncertainty and optional confidence;
- user-confirmed or revised Diagnosis persistence;
- Design AI centered on machine change, rationale, expected result and success signal;
- user-confirmed/revised Design plus 1–5 minimal Actions persisted atomically;
- pending/completed/cancelled Action execution without generic project-management surfaces;
- Outcome blocked while Actions remain pending;
- Action completion alone never marks a Design successful;
- atomic Outcome + direct-user Evidence + accepted Goal-scoped Observation;
- user comparison `improved | mixed | worse | unclear`;
- one Outcome per Design in v1;
- evaluated Design Actions become immutable;
- post-Outcome Review stored as completed Reflection linked to the matching Outcome/Goal/Problem;
- stale pending Diagnosis/Design proposals are superseded on retry;
- safe Phase 3 client projection excludes Workspace IDs, Evidence UUIDs and AI provenance IDs.

The signed-in UI remains sparse. Phase 2 handles learning/understanding; once its Principle is reviewed, the change loop appears as:

```text
Diagnose → Design → Do → Outcome → Review
```

## 5. Reality Engine

Current Reality sources:

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ Evidence → Principles reasoning
Direct user observations ───────────────┤
Recorded Outcomes ──────────────────────┘
```

Privacy invariant: public live search receives only the public query, never private RAG excerpts.

Future Reality sources may include metrics, calendars, finance, CRM and operating systems after their product boundaries are justified.

## 6. UI direction

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Rules:

- whitespace may remain empty;
- one primary active step/action at a time;
- completed state stays compact;
- details/evidence/uncertainty use progressive disclosure;
- AI appears as system intelligence, not fictional agents;
- internal ontology is not exposed as a giant form;
- task/project breadth is not a product goal by itself.

## 7. Phase progress

| Phase | Name | Status | Actual / expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Product philosophy, kernel language, UI rules and phase governance established. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user safely owns durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works and survives reload. |
| 3 | Design + Execution | **Ready** | Diagnosis → machine Design → Actions → observed Outcome → Review works end-to-end and passes re-audit; awaiting merge. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal history produces evidence-backed, correctable patterns and improving Principles. |
| 5 | Principles for Organizations | Planned | The proven People kernel extends to collective people/culture machines, governance and domain-specific believability. |

## 8. Phase 3 verification and audit outcome

Re-audit code head `3d590dd05cc4faa21fa9629f57060a9edac57b87` passed:

- Foundation #149 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit tests, serial real-Postgres integration tests, production build;
- Playwright #251 ✅ — complete Phase 2 + Phase 3 browser path through Outcome Review and reload, auth boundary, Knowledge projection and scrolling;
- Lint #484 ✅.

Audit findings corrected included async UI state narrowing, duplicate-text E2E coupling, missing cross-workspace Design/Outcome proof, Design revision semantics, Action-completion-versus-success ambiguity, Action mutability after evaluation, multiple Outcomes per Design, stale pending AI proposals and unstable editable Action keys.

A final CI pass is still required on the documentation closeout head before merge.

## 9. Known limitations at Phase 3 readiness

Intentionally not implemented:

- immediate cross-component Phase 2 → Phase 3 activation without a normal server render/navigation;
- generic Projects, kanban, assignment, recurring tasks, reminders or scheduling;
- multi-Goal execution portfolio UI;
- longitudinal Self Model/pattern learning;
- Organization Workspace collaboration;
- structured business connectors;
- CRM, finance, HR or operational domain products;
- password reset/email verification/OAuth/passkeys;
- scheduled/off-host DB backup and automated restore.

These are future work only when a later phase requires them.

## 10. Next phase boundary

**Phase 4 — Learning Engine + Self Model is Planned and has not started.**

It may use longitudinal evidence from Goals, Problems, Diagnoses, Designs, Actions, Outcomes, Reflections and Principles to detect recurring patterns. Every pattern must remain evidence-backed, inspectable and correctable rather than becoming a fixed personality label.

## 11. Retired architecture

Do not restore without an explicit new product decision:

- Thinker Machine;
- Council / Council agents;
- Brain / My Brain / Team Brain;
- historical-thinker personas;
- Principles Graph / constellation UI;
- Decision Workspace / Decision Brief / DecisionRun;
- old V2 route hierarchy/contracts.

Git history remains the archive.

## 12. Contributor rule

Every major phase follows:

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

A phase becomes Complete only after merge and source-of-truth closeout records the actual outcome, limitations, verification evidence and next-phase boundary.

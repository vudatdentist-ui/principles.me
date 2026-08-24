# PROJECT CONTEXT — Principles

**Status:** Phase 2 — Principles for People: First Complete Loop — **Complete**  
**Effective date:** 2026-08-24  
**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
**Next major phase:** Phase 3 — Design + Execution — Planned

This file is the source of truth for current product direction, architecture, phase progress and boundaries. If an older issue, branch, component, deleted V2 artifact or prior chat conflicts with this file, this file wins until deliberately updated.

Read with:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_1_OPERATIONS.md`
- `docs/product/PHASE_2_ARCHITECTURE.md`

## 1. Product mission

Principles is an **evolution system for people first and organizations second**.

Its core loop is:

```text
understand what I truly want
        ↓
choose a Goal
        ↓
see Reality more accurately
        ↓
recognize Problems / gaps
        ↓
diagnose root causes
        ↓
design a better machine
        ↓
execute
        ↓
observe Outcome
        ↓
reflect on pain / surprise / error
        ↓
form or revise Principles
        ↓
evolve
        ↺
```

The product is not a generic task manager, OKR app, journal, CRM, decision-only app, multi-agent council, thinker simulator or chatbot with Ray Dalio terminology layered on top.

## 2. Philosophical core

The product model is grounded in three connected ideas from Ray Dalio:

### Dreams + Reality + Determination

- Dream / desired reality expresses what the person or organization truly wants.
- Reality is the best available understanding of what is actually true.
- Determination is the capacity to act through the difficulty of changing Reality.
- Reality informs the path; it should not automatically shrink the Dream.

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

Problem, Diagnosis, Design and Execution are intentionally distinct concepts.

### Pain + Reflection = Progress

```text
experience
  → discrepancy
  → reflection
  → pattern
  → lesson
  → principle candidate
  → machine change
  → future evidence
```

Supporting mechanisms include Radical Truth, Radical Open-Mindedness, looking at the machine from a higher level, evidence/provenance and revisable principles.

## 3. Principles Kernel

Conceptual primitives include:

- Workspace / Actor
- Goal
- Evidence / Observation / Belief
- Problem
- Diagnosis
- Machine / Design
- Action / Outcome
- Reflection
- Principle
- Activity Event

Do not create one table or screen per conceptual noun mechanically. Durable schema is added only when a phase requires a proven behavior.

## 4. Goal definition

A Goal is **a chosen desired reality that matters enough to organize attention, trade-offs, diagnosis and action around it**.

A Goal is not `title + metric + target + deadline`.

Goal Discovery may clarify:

- desired reality;
- why it matters;
- success conditions;
- accepted trade-offs;
- non-negotiable boundaries;
- useful measures when they genuinely improve Reality sensing.

Measures are signals. They do not replace the meaning of the Goal.

## 5. Truth and Reality model

Principles preserves the distinction between source data and interpretation:

```text
SOURCE / EVENT
      ↓
   EVIDENCE
      ↓
 OBSERVATION
      ├────────→ BELIEF
      └────────→ HYPOTHESIS
                    ↓
                DIAGNOSIS
```

AI may propose observations, problems or principles, but AI output is never automatically accepted truth. Important AI-derived durable state keeps provenance and explicit acceptance/revision/rejection state.

## 6. Current implemented product — Phase 1 + Phase 2

### Secure personal platform

Phase 1 is Complete on `main`.

Implemented:

- first-party email/password authentication;
- scrypt password hashing;
- opaque hashed Postgres-backed sessions;
- one owned Personal Workspace per user;
- workspace membership foundation;
- PostgreSQL 16 durable system of record;
- workspace-scoped authorization and provenance constraints;
- Activity Events;
- durable provider/auth usage limits;
- checksum-bound migrations;
- DB-aware health;
- production DB topology, pre-migration snapshot, canary and rollback paths;
- authenticated workspace-scoped RAGFlow retrieval;
- safe browser evidence projection;
- Brave live public search + DeepSeek synthesis.

### Principles for People — first complete loop

Phase 2 is Complete on `main`.

The primary signed-in product loop is:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Implemented behavior:

- one focused Goal Discovery question at a time;
- deterministic fallback when Goal AI is unavailable;
- optional measures rather than KPI-first Goal modeling;
- Goal-scoped direct-user Reality observations;
- atomic Evidence + accepted Observation persistence;
- AI Problem proposal constrained to the selected Goal + Reality;
- explicit user confirmation/edit before durable Problem creation;
- progressive Reflection rather than a journal wall of fields;
- Reflection linked to matching Goal + Problem at DB level;
- AI Principle candidates with evidence/provenance;
- accept → testing, reject, and revise paths;
- no automatic promotion to trusted Principle;
- durable replay protection for AI-sourced Problems/Principles;
- safe client projection without internal evidence/workspace identifiers;
- Knowledge Q&A retained as an authenticated secondary surface at `/knowledge`.

## 7. Reality Engine

Current Reality sources:

```text
Private workspace knowledge → RAGFlow ──┐
                                        ├→ Evidence → AI reasoning
Current public web → Brave Search ──────┤
                                        │
Direct user observations ───────────────┘
```

Future Reality inputs may include metrics, outcomes, Activity Events, calendars, finance, CRM and operational systems. Structured business connectors are intentionally deferred.

Privacy invariant: public live search receives only the public search query, never private RAG excerpts.

## 8. UI direction

The system may become structurally deep. The interface must remain sparse.

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Rules:

- whitespace may remain empty;
- one primary active step/action at a time;
- completed state is compact;
- complexity and evidence are progressively disclosed;
- critical meaning must not depend on tiny helper copy;
- AI appears as system intelligence, not fictional agents/personas;
- the user should not operate the internal ontology directly.

## 9. Phase progress

| Phase | Name | Status | Actual / expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Product language, philosophical invariants, UI rules and execution governance established. |
| 1 | Secure Platform + Durable Kernel | **Complete** | A real user can safely own durable private Principles state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | A person can move from meaningful Goal → Reality → Problem → Reflection → revisable Principle candidate and recover the durable state after reload. |
| 3 | Design + Execution | Planned | A diagnosed problem can produce a machine design, actions, observed outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence creates correctable patterns and improves principles over time. |
| 5 | Principles for Organizations | Planned | The proven kernel extends to collective people/culture machines, governance and domain-specific believability. |

## 10. Phase 2 verification outcome

Before merge into `main`, Phase 2 was re-parented onto the merged Phase 1 commit, retargeted to `main`, stacked-only CI triggers were removed, and the final head passed:

- Foundation #135 — PostgreSQL 16, migrations 0001 + 0002, typecheck, unit tests, real-Postgres integration tests, production build;
- Lint #470;
- Playwright #237 — authentication boundary, complete People loop + reload, safe Knowledge evidence projection and normal scrolling.

Audit findings corrected included tenant/semantic composite FKs, evidence-ID leakage, AI suggestion replay, Goal-scoped Reality, optional-measure semantics, atomic Principle persistence, integration test races, and durable Principle accept/reject/revise behavior.

## 11. Known limitations after Phase 2

Not implemented yet:

- password reset, email verification, OAuth/passkeys;
- organization workspace product, invites and switching;
- Diagnosis product workflow;
- machine Design workflow;
- Actions / Projects / Outcome execution loop;
- longitudinal Self Model / pattern learning;
- durable general conversation history;
- CRM, finance, HR and operational domain products;
- structured business connectors;
- scheduled/off-host database backup and automated restore;
- organization believability/governance product.

These are not implied by deleted legacy code.

## 12. Next phase boundary

**Phase 3 — Design + Execution is Planned, not started by this closeout.**

Its purpose is to close more of the 5-Step Process without turning Principles into generic project management:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Reflection
```

Phase 3 must preserve all Phase 1/2 authorization, provenance, AI acceptance and minimal-UI invariants.

## 13. Retired architecture

Do not restore without an explicit new decision:

- Thinker Machine;
- Council / Council agents;
- Brain / My Brain / Team Brain;
- historical-thinker personas;
- Principles Graph / constellation UI;
- Decision Workspace / Decision Brief / DecisionRun;
- old V2 route hierarchy and contracts.

Git history is the archive.

## 14. Contributor rule

Every major phase follows:

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

At phase closeout, update this context with actual outcome, limitations, verification evidence and next-phase boundary before treating the phase as Complete.

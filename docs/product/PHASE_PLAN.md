# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24

This plan translates the Principles Kernel into a sequence of large product phases. A phase is not complete because code exists.

A phase is **Complete** only when:

1. the intended user loop/outcome works;
2. security and data boundaries required by that phase are enforced;
3. automated verification covers the critical path;
4. expected outcome is evaluated against the actual implementation/use;
5. `PROJECT_CONTEXT.md` records actual progress and limitations;
6. unresolved compromises are explicit;
7. the phase is accepted, merged and verified on the target branch.

## Progress states

- **Planned** — defined but not started.
- **Active** — current major implementation focus.
- **Ready** — implementation/spec work is complete on a branch/PR and awaiting acceptance/merge.
- **Complete** — merged, verified, and the phase outcome is recorded in product context.
- **Blocked** — cannot responsibly continue until a named dependency or decision is resolved.

## Stacked development rule

The default is sequential activation. A next phase may be developed as a **stacked PR** only when its predecessor is already Ready with green verification and the user explicitly asks to proceed. The stacked branch must be based on the verified predecessor head and receive its own CI.

Stacked development never relaxes merge/deploy order. A dependent phase cannot enter `main` or production before its predecessor dependency is resolved.

Phase 2 uses this explicit exception: PR #55 is stacked on Ready Phase 1 PR #54. Neither is Complete while unmerged.

## Program view

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, invariants, UI constraints and phase rules are explicit. |
| 1 | Secure Platform + Durable Kernel | **Ready — PR #54** | A user can safely own durable personal state and the system can store initial kernel primitives with provenance. |
| 2 | Principles for People — First Complete Loop | **Ready (stacked) — PR #55** | One person can move from meaningful Goal → Reality → Problem → Reflection → Principle in a minimal interface. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence creates correctable patterns and improves future guidance without turning inference into fixed truth. |
| 5 | Principles for Organizations | Planned | The same kernel supports collective goals, roles, permissions, disagreement and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete  
**Merged baseline:** `main`

## Objective

Prevent Principles from becoming conventional productivity software with Principles terminology layered on top.

## Delivered

- Principles Kernel specification;
- Goal as chosen desired reality rather than KPI CRUD;
- Reality/evidence distinction;
- distinct Problem, Diagnosis, Design, Outcome, Reflection and Principle concepts;
- personal and future organizational Machine framing;
- AI roles: Observe, Challenge, Diagnose, Design, Reflect;
- People-first / Organizations-later thesis;
- minimal UI principles and no-filler-microcopy constraint;
- phase governance.

## Outcome

Engineers and AI coding agents can identify what Principles is building, what the core nouns mean, what the UI should hide by default, and which work belongs to each phase without relying on deleted V2 history.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready  
**Implementation branch:** `phase/1-secure-platform-durable-kernel`  
**Pull request:** #54  
**Dependency state:** unmerged

## Objective

Create the smallest secure platform on which personal Principles state can exist safely and durably.

## Implemented

- first-party email/password authentication;
- scrypt password storage and opaque hashed sessions;
- bootstrap-only first production account;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- additive checksum-bound migrations;
- workspace as private retrieval and provider-quota boundary;
- strict server/client evidence projection;
- authenticated workspace-scoped private RAG + optional live-public Q&A;
- durable rate limits;
- private persistent production Postgres topology;
- pre-migration snapshots, canary and rollback-safe application promotion;
- real-Postgres and browser verification.

## Actual outcome

The secure substrate is present and verified on PR #54. It establishes identity, ownership, authorization, provenance, event history, provider-cost boundaries and durable kernel foundations. By itself it intentionally does not implement the complete People learning loop.

Phase 1 remains Ready, not Complete, until accepted and merged.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Ready (stacked)  
**Implementation branch:** `phase/2-people-first-complete-loop`  
**Pull request:** #55  
**Base/dependency:** Phase 1 PR #54 head

## Objective

Ship the smallest experience that proves Principles is an evolution system rather than a chatbot or goal tracker:

```text
Goal Discovery
    → Reality
    → Problem
    → Reflection
    → Principle Candidate
```

Deep Diagnosis, Design, Action and Outcome work remains Phase 3.

## Implemented behavior

### Goal Discovery

- one focused unresolved question at a time rather than a long form;
- desired reality, why it matters, qualitative success conditions, accepted trade-offs and non-negotiable boundaries are durable;
- measures are optional and cannot block Goal readiness;
- deterministic fallback lets the loop continue when the model is unavailable;
- AI provider use is skipped once required discovery fields are complete.

### Reality

- a direct user observation is persisted atomically as Evidence + accepted Observation;
- Observation is linked to the selected Goal;
- browser projection exposes the direct observation needed by the experience but strips internal evidence/workspace IDs;
- private RAG + optional live public search remain available separately through authenticated Knowledge Q&A.

### Problem

- durable Problem belongs to one workspace and one Goal;
- selected Evidence provenance is retained;
- AI output is only a proposal until the user confirms or edits it;
- proposal confirmation verifies Goal/evidence context;
- one AI suggestion cannot be replayed into multiple durable Problems.

### Reflection

The interface progressively captures:

```text
What happened?
What did you expect?
What surprised or hurt?
Is this recurring?
What might this teach you?
```

Reflection is durable, workspace-scoped and linked to both Goal and Problem. A database-level composite constraint prevents a same-workspace Reflection from pairing a Problem with the wrong Goal.

### Principle candidate

- AI proposal persistence is atomic with its AI Suggestion, evidence links and Activity Event;
- candidate retains Reflection origin, trigger, rule, rationale, evidence and optional confidence;
- candidates always begin `pending` + `candidate`;
- `accept` → `accepted` + `testing`;
- `reject` retains the candidate and marks it rejected;
- `revise` persists user-edited trigger/rule/rationale and marks the lifecycle revised;
- no tested provider/review path creates a `trusted` Principle automatically;
- one AI suggestion cannot be replayed into multiple Principles.

### Primary UI

The authenticated root is a sparse People loop:

```text
Goal → Reality → Problem → Reflect → Principle
```

Only one primary active step is shown at a time. Completed state is compact. Details/evidence are progressively disclosed. Knowledge Q&A moved to `/knowledge` as a secondary capability. Normal document scrolling remains intact.

## Security and provider boundary

All Phase 2 mutations use the same-origin guard and authenticated Personal Workspace. AI endpoints consume durable per-workspace quota before provider work and load private context server-side with workspace scope. Structured output is validated before persistence.

## Definition of Done — achieved on the stacked branch

Automated verification proves a realistic user can:

1. create/sign in and own a Personal Workspace;
2. discover and commit a meaningful Goal;
3. record Goal-scoped Reality with inspectable direct-user evidence;
4. recognize and confirm a Problem relative to that Goal;
5. complete progressive Reflection;
6. receive a Principle candidate;
7. accept/reject/revise candidates under durable lifecycle rules;
8. reload and retain the learning loop state.

Real-Postgres integration coverage also proves cross-workspace isolation, semantic Goal/Problem consistency, replay protection, transaction rollback behavior and absence of automatic trusted promotion.

## Audit and re-audit result

The required loop was executed:

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

Findings corrected included tenant-safe composite FK behavior, unnecessary client evidence-ID exposure, AI suggestion replay, Goal-scoped Reality, optional measures, transaction typing, behavior-oriented browser waits, Problem proposal context consistency, atomic Principle proposal persistence, driver-coupled integration assertions, destructive integration-test concurrency, same-workspace wrong-Goal Reflection linkage, and missing reject/revise/trusted-promotion coverage.

The implementation code-closeout head `710bfef93259008308075cad1e2a043b3cd94ce0` passed Foundation #126, Lint #461 and Playwright #228. The documentation-closeout head must pass the same final gate before PR #55 is marked Ready for review.

## Expected versus actual outcome

**Expected:** Principles begins accumulating high-quality user-owned learning rather than only answering questions.

**Actual:** one person can now persist a coherent chosen desired reality + observed reality + recognized gap + structured reflection + revisable principle candidate and recover it after reload. AI remains advisory and durable truth remains user-controlled.

Phase 2 remains Ready, not Complete, until Phase 1 is resolved and Phase 2 is accepted, merged in order and verified on its target branch.

## Explicit limitations carried forward

- no Diagnosis/Design/Action/Outcome product loop;
- no longitudinal self-model/pattern engine;
- no Organization Workspace product, invitations or workspace switching;
- no generic task/project execution engine;
- no password reset/email verification/OAuth/passkeys;
- no durable chat history/memory;
- no structured business connectors or generic CRM/finance/HR modules;
- no RAG-binding administration UI;
- no scheduled/off-host database backup or automated restore.

---

# Phase 3 — Design + Execution

**Status:** Planned — not started

## Objective

Close the path from recognized Problem to changed machine and observed Outcome:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Diagnosis must preserve symptom/root-cause distinctions, alternatives, uncertainty and evidence. Design represents machine change rather than a checklist. Execution adds only task/project primitives required to execute those designs reliably.

## Definition of Done

A user can take a diagnosed repeated problem, design a machine change, execute it, and compare actual results with expected outcomes.

## Expected outcome

Principles helps create behavior and machine change, not just insight.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned

## Objective

Use longitudinal evidence to make Principles meaningfully more useful over time through correctable repeated-pattern learning.

Possible capabilities include repeated-problem/pain detection, 5-Step failure-pattern analysis, stated-priority versus observed-behavior tensions, principle effectiveness and evolving strength/weakness candidates.

The self-model describes observations and patterns before reducing people to traits. Every meaningful pattern needs a correction path.

## Definition of Done

Principles can surface at least one useful longitudinal pattern that the user can trace to cases, correct if wrong, and use to change future behavior or a principle.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

## Objective

Extend the proven People kernel to a collective machine without weakening privacy, governance or truth-seeking.

New dimensions may include Organization Workspace, people, roles, responsibilities, teams, culture signals, issues/disagreements, governance and domain-specific believability.

Believability is domain-specific and evidence-backed, never a global human-worth score. Permissions remain explicit.

## Definition of Done

A small real team can share a Goal, surface a meaningful Problem/disagreement, inspect evidence under correct permissions, diagnose and change a machine, observe an outcome, reflect, and update an organizational Principle.

---

# Phase transition protocol

At the end of every phase:

1. run technical verification and critical-path product tests;
2. record what was actually built and deferred;
3. compare actual result with expected outcome;
4. update `PROJECT_CONTEXT.md`, this plan and `ROADMAP.md`;
5. obtain acceptance/merge;
6. verify the target branch;
7. only then call the phase Complete.

Stacked implementation of the next phase is an explicit user-directed exception permitted only from a verified Ready predecessor. It does not change merge/deploy order or completion semantics.

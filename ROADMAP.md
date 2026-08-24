# Principles roadmap

**Date:** 2026-08-24

Principles is being built as an **evolution system for people first and organizations second**.

The accepted `main` baseline contains the Principles Kernel definition. PR #54 contains the verified Phase 1 secure platform substrate and remains **Ready, unmerged**. PR #55 contains Phase 2 and is deliberately stacked on the Phase 1 head; Phase 2 is **Ready (stacked)** after implementation, audit and re-audit, but is not Complete until its dependency is resolved, it is merged in order, and the target branch is verified.

Detailed phase scope and Definitions of Done live in `docs/product/PHASE_PLAN.md`.

## Build rule

A phase is complete only when its intended behavioral outcome works, security/privacy boundaries are enforced, critical paths are automatically verified, actual outcome is compared with expected outcome, product context is updated, and the work is accepted/merged/verified on the target branch.

Stacked development is allowed only when a predecessor is already Ready and the user explicitly asks to start the next phase. Stack order remains strict: dependent work cannot enter `main` or production before its predecessor dependency is resolved.

## Phase 0 — Kernel Definition

**Status:** Complete

Established the product philosophy, kernel language, Reality/evidence distinction, AI/provenance boundaries, People-first/Organizations-later direction, minimal UI constraints and sequential phase governance.

Outcome achieved: implementation now has one explicit product model instead of inheriting legacy Decision/Council concepts.

## Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready for review on PR #54 — unmerged

Implemented and re-audited:

- first-party identity/session and one owned Personal Workspace per initial user;
- PostgreSQL 16 durable system of record;
- workspace isolation and database-level provenance constraints;
- Activity Events and minimal durable kernel foundations;
- AI Suggestions with acceptance state/provenance;
- authenticated workspace-scoped RAGFlow + optional live web Reality Q&A;
- safe server/client evidence projection;
- durable provider/auth usage limits;
- checksum-bound migrations and DB-aware health;
- private persistent production Postgres topology;
- pre-migration snapshots, canary promotion and application rollback path;
- real-PostgreSQL integration verification and browser tests.

Expected outcome: Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

Actual outcome: that secure substrate exists and passes re-audit. Phase 1 itself intentionally stops before the complete People learning loop.

## Phase 2 — Principles for People: First Complete Loop

**Status:** Ready (stacked) on PR #55 — unmerged

Implemented the first complete product loop:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Delivered behavior:

- Goal Discovery asks one high-value unresolved question at a time and preserves Goal as a chosen desired reality rather than KPI CRUD;
- qualitative success conditions, accepted trade-offs and non-negotiable boundaries are durable; measures remain optional;
- direct-user Reality is stored atomically as Evidence + accepted Observation and tied to the chosen Goal;
- durable Problem records retain Goal and evidence provenance; AI Problem output remains a proposal until user confirmation/edit;
- Reflection progressively captures happened/expected/surprise/recurrence/learning and must match its Problem's Goal at the DB layer;
- AI Principle candidates retain Reflection origin, evidence, confidence and explicit acceptance state;
- users can accept, reject or revise candidates; acceptance moves only to `testing`, never directly to `trusted`;
- authenticated root is now the sparse People loop; Knowledge Q&A is secondary at `/knowledge`;
- real-Postgres and browser tests prove durability, workspace isolation, replay protection, atomicity and reload behavior.

Expected outcome: Principles begins accumulating user-owned learning rather than only answering questions.

Actual outcome: one coherent unit of Goal + observed Reality + recognized gap + Reflection + revisable Principle can now persist and survive reload. Deep Diagnosis, Design, Actions and Outcomes remain intentionally absent.

## Phase 3 — Design + Execution

**Status:** Planned — not started

Close the 5-Step path from recognized Problem to changed machine and observed result:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Add only task/project functionality required to execute machine changes. Avoid feature-count competition with generic project-management software.

Expected outcome: Principles can turn insight into changed behavior, changed systems and observed outcomes.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned

Use longitudinal evidence to detect and test recurring problems, pain patterns, likely 5-Step failure points, conflicts between stated priorities and observed behavior, principle effectiveness, repeated design failures and evolving strength/weakness candidates.

The self-model remains evidence-backed, correctable and non-deterministic.

Expected outcome: Principles creates compounding value from the user's own history.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven kernel to the collective machine with Organization Workspace, people/roles/responsibilities/teams, culture signals, issues/disagreements, governance, domain-specific believability and permission-aware collective truth-seeking.

Expected outcome: a real team can use the same kernel to improve its machine without weakening privacy or reducing people to simplistic scores.

## Current Reality Engine

```text
Private workspace knowledge -> RAGFlow ------+
                                            |
Current public web ----------> Brave Search -+--> Evidence --> DeepSeek
```

Phase 2 adds direct user observations as another durable Reality source. Future phases may add Activity Events, metrics, outcomes, calendars, CRM, finance and operations systems only when justified by a concrete workflow.

## UI constraint across every phase

The system may become complex. The interface must not.

> Do not use small explanatory text to compensate for unclear structure or to fill empty space.

Prefer stronger state, fewer visible items, direct actions, progressive disclosure, inspectable evidence on demand, and empty space when nothing more deserves attention.

## Explicitly retired directions

These are not roadmap items:

- Thinker Machine modes;
- Council or simulated thinker agents;
- Brain / constellation / Principles Graph surfaces;
- Decision Brief / Decision Workspace as the product core;
- historical-thinker simulation;
- old V2 decision schema;
- generic CRM/HR/Finance modules before a later concrete phase justifies them.

Git history preserves those experiments. They are not current requirements.

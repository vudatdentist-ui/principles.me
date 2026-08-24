# Principles roadmap

**Date:** 2026-08-24

Principles is being built as an **evolution system for people first and organizations second**.

The current accepted `main` contains the Principles Kernel definition. PR #54 adds the Phase 1 secure platform substrate: identity, owned Personal Workspace, durable PostgreSQL kernel foundations, workspace-scoped Reality Q&A and operational safety. Phase 1 is **Ready for acceptance**, not Complete until merged.

Detailed phase scope, Definition of Done, and expected outcomes live in `docs/product/PHASE_PLAN.md`.

## Build rule

Only one major phase is active at a time.

A phase is complete only when:

- its intended behavioral outcome works;
- required security/privacy boundaries work;
- critical paths are automatically verified;
- actual outcome is compared with expected outcome;
- `PROJECT_CONTEXT.md` records actual architecture, limitations and the next phase.

## Phase 0 — Kernel Definition

**Status:** Complete

Established:

- Dreams + Reality + Determination;
- the 5-Step Process;
- Pain + Reflection = Progress;
- Radical Truth, Radical Open-Mindedness and higher-level machine perspective;
- People-first / Organizations-later architecture;
- conceptual kernel language;
- AI/provenance boundaries;
- UI principles;
- sequential phase governance.

Outcome achieved: implementation work now has one explicit product model instead of inheriting legacy Decision/Council concepts.

## Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready for review on PR #54

Implemented and re-audited:

- first-party identity/session;
- one owned Personal Workspace per user;
- PostgreSQL 16 durable system of record;
- workspace isolation and database-level provenance constraints;
- Activity Event history and minimal durable kernel foundations;
- AI suggestions with acceptance state/provenance;
- authenticated `/api/ask` with workspace-scoped RAGFlow bindings;
- safe server/client evidence projection;
- durable provider/auth usage limits;
- checksum-bound migrations and DB-aware health;
- private persistent production Postgres topology;
- pre-migration snapshots, canary promotion and application rollback path;
- real-PostgreSQL integration verification and browser tests.

Expected outcome: Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

Actual outcome: that secure substrate exists and passes re-audit. It does **not** yet provide the first complete Principles People loop.

## Phase 2 — Principles for People: First Complete Loop

**Status:** Planned — activate only after Phase 1 is accepted and merged

Ship the first product loop:

```text
Goal Discovery
  -> Reality
  -> Problem
  -> Reflection
  -> Principle Candidate
```

The Goal experience must distinguish a chosen desired reality from desires, proxy metrics, competing priorities and accepted trade-offs.

The UI remains sparse and does not expose the domain schema as forms.

Expected outcome: Principles begins accumulating user-owned learning rather than only answering questions.

## Phase 3 — Design + Execution

**Status:** Planned

Close the 5-Step Process:

```text
Problem
  -> Diagnosis
  -> Design
  -> Actions
  -> Outcome
  -> Reflection
```

Add only task/project functionality required to execute machine changes. Avoid feature-count competition with generic project-management software.

Expected outcome: Principles can turn insight into changed behavior, changed systems and observed outcomes.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned

Use longitudinal evidence to detect and test recurring problems, pain patterns, likely 5-Step failure points, conflicts between stated priorities and observed behavior, principle effectiveness, repeated design failures, and evolving strength/weakness candidates.

The self-model remains evidence-backed, correctable and non-deterministic.

Expected outcome: Principles creates compounding value from the user's own history.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven kernel to the collective machine with Organization Workspace, people/roles/responsibilities/teams, culture signals, issues/disagreements, governance, domain-specific believability and permission-aware collective truth-seeking.

Expected outcome: a real team can use the same kernel to improve its machine without weakening privacy or reducing people to simplistic scores.

## Reality Engine baseline

The existing intelligence stack remains useful throughout the phases:

```text
Private workspace knowledge -> RAGFlow ------+
                                            |
Current public web ----------> Brave Search -+--> evidence --> DeepSeek
```

Phase 1 makes private retrieval workspace-scoped before provider access. Later Reality inputs may include Activity Events, metrics, calendars, CRM, finance and operations systems.

## UI constraint across every phase

The system may become complex. The interface must not.

> Do not use small explanatory text to compensate for unclear structure or to fill empty space.

Prefer stronger state, fewer visible items, direct actions, progressive disclosure, inspectable evidence on demand, and empty space when nothing more deserves attention.

## Explicitly retired directions

The following are not roadmap items:

- Thinker Machine modes;
- Council or simulated thinker agents;
- Brain / constellation / Principles Graph surfaces;
- Decision Brief / Decision Workspace as the product core;
- historical-thinker simulation;
- old V2 decision schema;
- generic CRM/HR/Finance modules before the kernel and phase boundaries justify them.

Git history preserves those experiments. They are not current requirements.

# Principles Roadmap

**Date:** 2026-08-24  
**Current baseline:** Phase 0 + Phase 1 + Phase 2 Complete on `main`

Principles is being built as an **evolution system for people first and organizations second**.

## Build rule

A phase is Complete only when:

- its intended behavioral outcome works;
- required privacy/security boundaries work;
- critical paths are automatically verified;
- expected outcome is compared with actual outcome;
- `PROJECT_CONTEXT.md` records the real architecture, limitations and next phase;
- the phase is accepted and merged to the target branch.

Every phase uses:

```text
Understand → Criteria → Build → Audit → Fix → Re-audit → Final check → Report
```

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product model, Principles language, UI constraints and phase governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Authenticated Personal Workspace with durable PostgreSQL state, provenance, isolation and bounded AI/retrieval usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal Discovery → Reality → Problem → Reflection → revisable Principle works end-to-end and persists across reload. |
| 3 | Design + Execution | Planned | Turn diagnosed problems into machine changes, actions and measurable outcomes. |
| 4 | Learning Engine + Self Model | Planned | Learn correctable longitudinal patterns from the user's own history. |
| 5 | Principles for Organizations | Planned | Extend the proven kernel to collective people/culture machines, governance and domain-specific believability. |

## Phase 0 — Kernel Definition

Established:

- Dreams + Reality + Determination;
- the 5-Step Process;
- Pain + Reflection = Progress;
- Radical Truth / Radical Open-Mindedness;
- Goal as chosen desired reality rather than KPI CRUD;
- Evidence versus Observation/Belief/Hypothesis;
- revisable Principles;
- People-first / Organizations-later architecture;
- minimal UI and no-filler-microcopy rule.

## Phase 1 — Secure Platform + Durable Kernel

**Complete. Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Delivered:

- first-party identity/session;
- owned Personal Workspace;
- PostgreSQL 16 system of record;
- cross-workspace DB constraints;
- Activity Events and AI Suggestions with acceptance state;
- workspace-scoped RAGFlow retrieval;
- authenticated `/api/ask`;
- durable rate/provider controls;
- bounded client evidence projection;
- Brave live search + DeepSeek synthesis;
- migration, health, canary, backup-snapshot and rollback foundations;
- real-Postgres + browser verification.

Expected outcome achieved: Principles can safely begin learning durable private state about a real person.

## Phase 2 — Principles for People: First Complete Loop

**Complete. Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

Delivered:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Important properties:

- one focused Goal question at a time;
- Goal meaning includes why, success conditions, trade-offs and boundaries;
- measures are optional signals;
- Reality is explicitly linked to Goal;
- direct observations persist as Evidence + Observation atomically;
- Problems remain user-confirmed rather than AI truth;
- Reflection is progressive and structured;
- Principle candidates are revisable and start untrusted;
- accept moves only to testing;
- reject/revise remain durable;
- replay and cross-workspace/cross-Goal provenance are constrained;
- `/knowledge` remains secondary authenticated Q&A.

Expected outcome achieved: Principles now accumulates one coherent unit of user-owned learning instead of resetting to stateless Q&A.

Final main-target re-audit before merge:

- Foundation #135 ✅
- Lint #470 ✅
- Playwright #237 ✅

## Phase 3 — Design + Execution

**Status:** Planned

Purpose: continue the 5-Step Process from recognized Problem to changed machine and observed result.

Target loop:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Constraints:

- Diagnosis must distinguish symptom, proximate cause and root-cause hypothesis;
- Design represents machine change, not merely a task list;
- Actions exist only to execute a Design;
- Outcomes compare expected versus actual Reality;
- Today/attention UI should remain sparse;
- do not compete with generic project-management software on feature count.

Expected outcome: Principles can turn insight into changed behavior/system and observe whether the design worked.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned

Use longitudinal evidence to detect and test:

- recurring Problems and Pain signals;
- repeated 5-Step failure points;
- stated priorities versus observed behavior;
- recurring diagnosis/design failures;
- Principle effectiveness;
- evolving strength/constraint hypotheses.

Every inferred pattern must remain evidence-backed, inspectable and correctable.

Expected outcome: the product compounds value from the person's own history.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the same kernel to collective machines with:

- Organization Workspaces;
- people, roles, responsibilities and teams;
- culture signals;
- issues and disagreements;
- permissions and governance;
- domain-specific, evidence-backed believability.

Radical Transparency must coexist with authorization and accountability.

Expected outcome: a real team can improve its machine using the same learning loop proven for individuals.

## Reality Engine baseline

```text
Private workspace knowledge → RAGFlow ──┐
Current public web → Brave Search ──────┼→ Evidence → DeepSeek / Principles reasoning
Direct user observations ───────────────┘
```

Future Reality inputs may include metrics, outcomes, calendar, finance, CRM and operating systems.

## UI constraint across all phases

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct action, progressive disclosure, inspectable evidence and empty space when nothing more deserves attention.

## Retired directions

Not roadmap items unless explicitly reintroduced:

- Thinker Machine;
- Council / simulated thinker agents;
- Brain / constellation / Principles Graph;
- Decision Workspace / Decision Brief as the product core;
- historical-thinker simulation;
- old V2 decision architecture.

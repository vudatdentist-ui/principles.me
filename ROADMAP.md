# Principles Roadmap

**Date:** 2026-08-24  
**Current merged baseline:** Phases 0–2 Complete on `main`  
**Current ready work:** Phase 3 — Design + Execution — PR #57

Principles is an **evolution system for people first and organizations second**.

## Build rule

A phase is Complete only when:

- its intended behavioral outcome works;
- privacy/security/data boundaries required by the phase work;
- critical paths are automatically verified;
- expected outcome is compared with actual outcome;
- source-of-truth records actual architecture, limitations and next phase;
- the phase is accepted and merged.

Every phase uses:

```text
Understand → Criteria → Build → Audit → Fix → Re-audit → Final check → Merge → Report
```

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared philosophical/product kernel, UI constraints and phase governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Authenticated Personal Workspace with PostgreSQL state, provenance, isolation and bounded AI/retrieval usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works end-to-end and persists. |
| 3 | Design + Execution | **Ready** | Diagnosis → machine Design → Actions → observed Outcome → Review works and passes re-audit; awaiting merge. |
| 4 | Learning Engine + Self Model | Planned | Learn correctable longitudinal patterns from the person's own history. |
| 5 | Principles for Organizations | Planned | Extend the proven kernel to collective people/culture machines, governance and domain-specific believability. |

## Phase 0 — Kernel Definition

Established Dreams + Reality + Determination, the 5-Step Process, Pain + Reflection = Progress, Radical Truth/Open-Mindedness, Goal as chosen desired Reality, evidence versus interpretation, revisable Principles, People-first architecture and the no-filler-microcopy rule.

## Phase 1 — Secure Platform + Durable Kernel

**Complete. Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Delivered first-party identity/session, owned Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, authenticated workspace-scoped RAGFlow, Brave live search, DeepSeek synthesis, provider controls, safe client evidence projection, migration/health/canary/rollback foundations and real-Postgres/browser verification.

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

Important properties: one focused Goal question at a time; trade-offs/boundaries and optional measures; Goal-scoped Reality; atomic Evidence + Observation; user-confirmed Problems; progressive Reflection; revisable Principle candidates; accept only to testing; replay/tenant/semantic constraints; `/knowledge` remains secondary Reality Q&A.

Final main-target verification before merge: Foundation #135 ✅, Lint #470 ✅, Playwright #237 ✅.

## Phase 3 — Design + Execution

**Status:** **Ready on PR #57**

Delivered change loop:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Key properties:

- Diagnosis separates symptom, proximate cause and root-cause hypothesis;
- supporting/contradicting evidence, alternatives and uncertainty remain explicit;
- AI Diagnosis/Design proposals require user confirmation or revision;
- Design represents machine change with rationale, expected result and success signal;
- only 1–5 Actions needed to execute that Design are added;
- Actions completed/cancelled are durable, but completion does not imply success;
- Outcome is blocked while Actions remain pending;
- Outcome atomically creates Evidence + accepted Goal-scoped Observation;
- user compares actual with expected as improved/mixed/worse/unclear;
- valid Outcome evaluates the Design; evaluated Actions become immutable;
- post-Outcome Review creates Reflection linked to the matching Outcome/Goal/Problem;
- stale pending AI proposals are superseded on retry;
- browser projection excludes internal Workspace/Evidence/AI provenance identifiers;
- no generic Project/kanban/team-assignment product was added.

Re-audit code head `3d590dd05cc4faa21fa9629f57060a9edac57b87`:

- Foundation #149 ✅
- Playwright #251 ✅
- Lint #484 ✅

A final verification run is required on the documentation closeout head before merge.

Expected outcome achieved on the branch: Principles no longer stops at insight. It can change a personal machine, observe Reality after execution and feed the result back into Reflection.

Known Phase 3 limitations: one v1 Outcome per Design; no generic project management; no longitudinal pattern engine; Phase 3 becomes visible after a normal server render/navigation once the Phase 2 Principle has been reviewed.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned — not started

Use longitudinal evidence to detect and test:

- recurring Problems/Pain;
- repeated 5-Step failure points;
- stated priorities versus observed behavior;
- repeated diagnosis/design failures;
- Principle effectiveness;
- evolving strength/constraint hypotheses.

Every inferred pattern must be evidence-backed, inspectable and correctable.

Expected outcome: Principles compounds value from the person's own history instead of treating each loop as isolated.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven People kernel with Organization Workspace, roles/responsibilities/teams, culture signals, issues/disagreements, permissions, governance and domain-specific evidence-backed believability.

Radical Transparency must coexist with authorization and accountability.

## Reality Engine baseline

```text
Private knowledge → RAGFlow ────────┐
Public current reality → Brave ─────┼→ Evidence → Principles reasoning
Direct observations ────────────────┤
Outcomes ───────────────────────────┘
```

Future sources may include metrics, calendar, finance, CRM and operating systems when justified by later product phases.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions, progressive disclosure, inspectable evidence and empty space when nothing more deserves attention.

## Retired directions

Not roadmap items unless explicitly reintroduced: Thinker Machine, Council/simulated thinker agents, Brain/constellation/Principles Graph, Decision Workspace/Brief as product core, historical-thinker simulation and old V2 decision architecture.

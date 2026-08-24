# Principles Roadmap

**Date:** 2026-08-24  
**Current baseline:** Phases 0–3 Complete on `main`  
**Next:** Phase 4 — Learning Engine + Self Model — Planned

Principles is an **evolution system for people first and organizations second**.

## Build rule

Every major phase follows:

```text
Understand → Criteria → Build → Audit → Fix → Re-audit → Final check → Merge → Report
```

A phase is Complete only when behavior works, required boundaries are verified, expected outcome is compared with actual outcome, source-of-truth is updated and the work is merged.

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared philosophical/product kernel, UI constraints and phase governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Authenticated Personal Workspace with PostgreSQL state, provenance, isolation and bounded AI/retrieval usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → observed Outcome → Review works durably and is merged. |
| 4 | Learning Engine + Self Model | Planned | Learn correctable longitudinal patterns from the person's own history. |
| 5 | Principles for Organizations | Planned | Extend the proven kernel to collective people/culture machines, governance and domain-specific believability. |

## Phase 1

**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Identity/session, Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, authenticated RAGFlow, Brave + DeepSeek, provider controls, safe client projection and deployment safety foundations.

## Phase 2

**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal meaning includes why, success conditions, trade-offs and boundaries; measures are optional. Reality is Goal-scoped Evidence + Observation. Problems and Principles remain user-reviewed rather than AI truth.

## Phase 3

**Complete. Merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`

```text
Problem → Diagnosis → Design → Actions → Outcome → Review / Reflection
```

Delivered:

- symptom/proximate/root-cause Diagnosis with evidence for/against, alternatives and uncertainty;
- user-confirmed/revised Diagnosis and Design;
- Design as machine change with rationale, expectation and success signal;
- 1–5 minimal Actions only to execute that Design;
- Action completion does not imply success;
- Outcome requires no pending Actions and records actual Reality against expected Reality;
- atomic Outcome + Evidence + Observation;
- valid Outcome evaluates Design and locks evaluated Actions;
- post-Outcome Review creates linked Reflection;
- tenant/semantic/replay constraints and safe browser projections;
- no generic project-management shell.

Final verification before merge:

- Foundation #154 ✅
- Lint #489 ✅
- Playwright #256 ✅

**Actual outcome:** Principles no longer stops at insight. It can change a personal machine, observe the resulting Reality and feed the result back into Reflection.

Known limitations: one v1 Outcome per Design, one surfaced execution chain for the selected Goal/Problem, no generic PM features, and a normal server render/navigation currently bridges reviewed Phase 2 Principle to Phase 3 surface.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned — not started

Use longitudinal evidence to test recurring Problems/Pain, repeated 5-Step failure points, stated priorities versus behavior, recurring diagnosis/design failures, Principle effectiveness and evolving strength/constraint hypotheses.

Every pattern must remain evidence-backed, inspectable and correctable.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven People kernel with Organization Workspace, people/roles/responsibilities/teams, culture signals, disagreement, permissions, governance and domain-specific evidence-backed believability.

## Reality Engine

```text
Private knowledge → RAGFlow ─────────┐
Public current reality → Brave ──────┼→ Evidence → Principles reasoning
Direct observations ────────────────┤
Outcomes ───────────────────────────┘
```

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct actions and progressive disclosure.

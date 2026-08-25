# Principles Roadmap

**Date:** 2026-08-24  
**`main` baseline:** Phases 0–3 Complete  
**Branch status:** Phase 4 — Learning Engine + Self Model — **Ready, not merged**

Principles is an **evolution system for people first and organizations second**.

## Build rule

```text
Understand → Criteria → Build → Audit → Fix → Re-audit → Final check → Report
```

A phase becomes Complete only when its behavior and boundaries are verified, actual outcome/limitations are recorded, and — when requested — the work is accepted and merged. Phase 4 is Ready because this request did not include merge.

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared philosophical/product kernel, UI constraints and phase governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Authenticated Personal Workspace with PostgreSQL state, provenance, isolation and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → observed Outcome → Review works durably and is merged. |
| 4 | Learning Engine + Self Model | **Ready** | Durable history produces evidence-backed, user-correctable Pattern hypotheses that can revise a Principle back into testing. |
| 5 | Principles for Organizations | Planned | Extend the proven People kernel to collective machines, governance and contextual believability. |

## Completed foundation

**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
Identity/session, Personal Workspace, PostgreSQL, tenant/provenance constraints, authenticated RAGFlow, Brave + DeepSeek, safe client projection and deployment-safety foundations.

**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
`Goal Discovery → Reality → Problem → Reflection → Principle Candidate`, with user-reviewed AI suggestions and no automatic trusted Principle.

**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
`Problem → Diagnosis → Design → Actions → Outcome → Review`, with actual Reality required before Design evaluation and no generic project-management shell.

## Phase 4 — Learning Engine + Self Model

**Status:** Ready on `phase/4-learning-self-model`; not merged.

Delivered:

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → test again
```

Important properties:

- Self Model = accepted/revised hypotheses, not personality labels;
- Pattern proposal requires ≥2 completed Reflections;
- AI uses ephemeral case/Principle keys, not durable UUIDs;
- `recurring_pattern` requires at least two distinct Problems and is enforced in PostgreSQL;
- only the 8 most recent completed Reflection cases are considered per proposal, in chronological order, with bounded model-facing excerpts;
- stale pending proposals are superseded;
- user can inspect, correct, keep or reject a Pattern;
- rejected proposal creates no Pattern row;
- safe client projection excludes Workspace/Evidence/AI provenance/internal semantic join IDs;
- accepted/revised Pattern may inform one explicit Principle revision;
- Principle revision preserves before/after history and returns to `revised + testing`, never `trusted`;
- no scores, charts, trait feed, streaks or analytics dashboard.

Runtime verification on head `4ae0d5cefc51b8137f943720f68bbac86175ac30`:

- Foundation #163 ✅
- Lint #498 ✅
- Playwright #265 ✅

Audit corrected TypeScript ephemeral-key inference, a client-side recurring-pattern semantic bypass, stale-history selection and unbounded model-facing history text.

Known v1 limits: manual pattern discovery; 8 most recent Reflection cases per proposal rather than semantic retrieval across unlimited history; one Pattern→Principle revision; Learning remains a secondary `/learning` page.

## Phase 5 — Principles for Organizations

**Status:** Planned. Start only after Phase 4 is explicitly accepted/merged.

Potential scope: Organization Workspace, people/roles/responsibilities/teams, culture signals, disagreements, permissions/governance and contextual evidence-backed believability. Radical Transparency must coexist with authorization and accountability.

## Reality / Learning Engine

```text
Private knowledge → RAGFlow ─────────────┐
Public current reality → Brave ─────────┤
Direct observations / Outcomes ─────────┤→ Evidence + durable history → Principles reasoning
Reflections / Principles ───────────────┘
```

Public live search never receives private RAG excerpts.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct action and progressive disclosure.

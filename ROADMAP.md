# Principles Roadmap

**Date:** 2026-08-25  
**`main` baseline:** Phases 0–5 **Complete**  
**Next major phase:** **Not defined; requires an explicit product decision**

Principles is an **evolution system for people first and organizations second**.

## Build rule

```text
Understand → Goal / Criteria → Build → Audit → Compare → Fix → Re-audit → Production verify → Closeout → Report
```

A phase becomes Complete only when its behavior and boundaries are verified, actual outcome/limitations are recorded, the work is accepted/merged, production is verified when applicable, and source of truth is closed out.

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared philosophical/product kernel, UI constraints and phase governance. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Authenticated Personal Workspace with PostgreSQL state, provenance, isolation and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → revisable Principle works durably. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → observed Outcome → Review works durably. |
| 4 | Learning Engine + Self Model | **Complete** | Durable history produces evidence-backed, user-correctable Pattern hypotheses that can revise a Principle back into testing. |
| 5 | Principles for Organizations | **Complete** | A governed collective machine can make roles, responsibilities, issues, disagreement and contextual track record explicit without people scoring. |

## Completed foundation

**Phase 1 merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`  
Identity/session, Personal Workspace, PostgreSQL, tenant/provenance constraints, authenticated RAGFlow, Brave + DeepSeek, safe client projection and deployment-safety foundations.

**Phase 2 merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`  
`Goal Discovery → Reality → Problem → Reflection → Principle Candidate`, with user-reviewed AI suggestions and no automatic trusted Principle.

**Phase 3 merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`  
`Problem → Diagnosis → Design → Actions → Outcome → Review`, with actual Reality required before Design evaluation and no generic project-management shell.

**Phase 4 merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
`History → Pattern hypothesis → inspect/correct → optional Principle revision → testing again`; production deploy `32838276392`.

**Phase 5 merge:** `0fa12577636715437f3208e8289d71931433aa61`  
`Organization → machine structure → Issue → Disagreement → contextual evidence → governed resolution`; production deploy `32844721161`.

## Phase 4 — Learning Engine + Self Model

**Status:** Complete and production-verified.

Phase 4 made longitudinal personal history inspectable and correctable without turning AI inference into fixed identity. Patterns use bounded recent Reflections, preserve provenance, support evidence/counter-evidence/uncertainty and may explicitly revise a Principle back into testing.

Final pre-merge: Foundation #180 ✅ · Lint #515 ✅ · Playwright #282 ✅.  
Post-merge: Foundation #181 ✅ · Lint #516 ✅ · Playwright #283 ✅ · production `32838276392` ✅.

## Phase 5 — Principles for Organizations

**Status:** Complete and production-verified.

Delivered:

- Setup key removed from normal account creation; only explicit `AUTH_SIGNUP_MODE=disabled` closes signup;
- authenticated Organization Workspace with safe `org_...` client handle instead of Workspace UUID;
- owner-managed members, roles, responsibilities, role assignments, teams and team assignments;
- server-enforced owner/member governance and PostgreSQL cross-organization constraints;
- attributable Issues and Disagreements representing collective Reality rather than anonymous sentiment;
- context-specific track-record evidence with evidence-for/evidence-against and no global believability score;
- sparse `/organization` UI with progressive disclosure;
- existing Personal Workspace, People, Knowledge and Learning boundaries preserved.

Final pre-merge head `424764e8855d37c4b961ab968386dc409e0d7b85`:

- Foundation #189 ✅
- Lint #524 ✅
- Playwright #291 ✅

Post-merge main `0fa12577636715437f3208e8289d71931433aa61`:

- Foundation #190 ✅
- Lint #525 ✅
- Playwright #292 ✅
- production deploy `32844721161` ✅
- `MIGRATION_APPLIED=0005_organizations.sql` ✅
- backup/migration/canary/public exact-SHA/zero-downtime gates ✅

Phase 5 audit corrected stale Setup-key test coverage, organization-switcher accessibility semantics, new CSS warning debt and an ambiguous browser assertion before the final re-audit passed.

Known v1 limits: members must already have a Principles account before an owner adds them by email; no invite delivery/magic links; owner/member permissions only; no anonymous culture surveys or culture score; no global people ranking; no organization-wide AI learning across unlimited history; no SSO/SCIM, HR workflows or business connectors.

## Reality / Learning Engine

```text
Private knowledge → RAGFlow ─────────────┐
Public current reality → Brave ─────────┤
Direct observations / Outcomes ─────────┤→ Evidence + durable history → Principles reasoning
Reflections / Principles ───────────────┘

Organization members
  → Issues / Disagreements / contextual evidence
  → inspectable collective reality + governance
```

Public live search never receives private RAG excerpts. Organizational evidence remains attributable and contextual rather than becoming identity-level scoring.

## Next boundary

No Phase 6 or other next major phase is implied. A new major phase starts only after an explicit product decision defines its goal, boundaries and acceptance contract.

## UI constraint

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Prefer fewer visible items, stronger state, direct action and progressive disclosure.

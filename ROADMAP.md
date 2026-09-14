# Principles Roadmap

**Effective date:** 2026-09-14  
**Completed major phases:** 0–5  
**Current phase:** **Phase 6 — Product Recenter / Evolution Engine — in progress / production**  
**Next major phase:** **Not defined; requires an explicit product decision.**

Principles is an evolution system for people first and organizations second.

## Build rule

```text
Understand → Goal / Criteria → Build → Audit → Compare → Fix → Re-audit
→ Independent gates → Production verify → Closeout → Report
```

A phase is Complete only when behavior/boundaries are verified, limitations are recorded, work is merged, the exact merged SHA is production-verified when applicable, and current source-of-truth is synchronized.

## Program status

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | Complete | Shared product philosophy, language and governance. |
| 1 | Secure Platform + Durable Kernel | Complete | Authenticated private Workspace, PostgreSQL state, provenance and safe provider boundaries. |
| 2 | People — First Complete Loop | Complete | Goal → Reality → Problem → Reflection → revisable Principle works durably. |
| 3 | Design + Execution | Complete | Diagnosis → Design → Actions → observed Outcome → Review works durably. |
| 4 | Learning Engine + Self Model | Complete | History yields evidence-backed correctable Pattern hypotheses and Principle revision. |
| 5 | Organizations | Complete | Governed organization structure, Issues, Disagreements and contextual track record without people scoring. |
| 6 | Product Recenter / Evolution Engine | In progress / production | One coherent Me → Organization → Knowledge → Learning experience around Dream, Reality, 5 Steps and Reflection. |

## Phase 6 delivered so far

Phase 6 is an orchestration/product-language recenter over the proven durable kernel, not a second data model.

Delivered:

- per-goal `EvolutionState` projection over existing People + Execution records;
- complete visible personal loop from Goal through Outcome/Reflection/Principle;
- multiple parallel Goals with one selected lane at a time;
- first-class Principles library with manual and Reflection-distilled paths;
- Knowledge framed around Principles/evidence while remaining non-writing;
- Learning recentered around Principles, Reflections and Patterns;
- Organization recentered around shared Reality, Issues, disagreement and machine design;
- editorial product-wide interaction language instead of dashboard/card-first presentation;
- interactive 5 Steps explorer with lived/current/ahead inspection and keyboard/browser coverage;
- mobile/reduced-motion support;
- exact-SHA production deployment of the recentered UI.

The current hardening tranche is part of Phase 6 closeout quality, **not Phase 7**. It adds product measurement, agent context hygiene, independent quality/security gates, observability, account data controls and restore verification.

## Current closeout priorities

### 1. Product learning

Measure without collecting intimate user text:

```text
Activation       Goal → Reality → Problem
Time to insight  account/workspace creation → first recognized Problem
Reflection return
Learning loop    Outcome reviewed → Principle accepted/revised
Stage reach      aggregate workspaces reaching each evolution stage
```

These metrics are directional evidence. They must not become user scores or substitute for user research.

### 2. Agent context hygiene

`AGENTS.md` is the short repository map. `PROJECT_CONTEXT.md` and `PHASE_6_ARCHITECTURE.md` are current normative product context. Phase 1–5 architecture docs are historical records and do not override current direction.

### 3. Independent verification

Material PRs should be challenged by external/falsifying gates rather than builder self-confidence: types, tests, real PostgreSQL, browser E2E, quality/privacy gate, secret scan, CodeQL and exact-SHA production verification.

### 4. Runtime observability

Production must expose safe operational evidence for DB readiness, AI provider failures/fallback and latency while never logging private prompts, Goal/Reflection/Principle content, credentials, tokens or emails.

### 5. Security and data lifecycle

Before meaningful scale, Principles needs tested account export/deletion, explicit retention policy, threat model, dependency/code scanning, backup restore proof and external human security review for high-blast-radius auth/privacy paths.

## Product boundary after hardening

Do not reward the repository for adding more modules. The next important evidence is whether real users:

- reach a meaningful Gap/Problem;
- return to reflect after outcomes;
- revise behavior or a Principle from observed Reality;
- keep using the loop because it improves decisions/actions.

Until evidence justifies a new major product direction, prefer learning, simplification, reliability and security over architecture expansion.

## Deferred unless explicitly pulled in

- generic task/project management;
- global believability or employee ranking;
- anonymous culture scoring;
- personality labels/profiling;
- arbitrary enterprise permission matrices;
- SSO/SCIM and HR/compensation workflows;
- autonomous durable AI writes;
- resurrecting retired Council/thinker-persona architecture.

## Current source of truth

```text
AGENTS.md
→ PROJECT_CONTEXT.md
→ docs/product/PHASE_6_ARCHITECTURE.md
→ docs/product/UI_PRINCIPLES.md
→ docs/product/INTERACTION_DESIGN.md
→ docs/product/PRODUCT_MEASUREMENT.md
```

Phase 6 closeout and any Phase 7 require separate explicit decisions; do not infer either from implementation momentum.

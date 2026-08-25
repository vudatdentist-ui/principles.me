# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24  
**Completed on `main`:** Phases 0–3  
**Current branch:** Phase 4 — Learning Engine + Self Model — **Ready, not merged**

## Phase execution protocol

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

`Complete` means the phase is accepted/merged and source-of-truth reflects the actual outcome. `Ready` means implementation and verification are complete on a branch but merge has not happened.

## Program view

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Safe durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle produces durable user-owned learning. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → Outcome → Review turns learning into observed machine change. |
| 4 | Learning Engine + Self Model | **Ready** | Longitudinal history produces useful, inspectable and correctable Pattern hypotheses that can improve a Principle. |
| 5 | Principles for Organizations | Planned | The proven kernel supports collective machines, governance and contextual believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

Established the Principles Kernel, Goal as chosen desired Reality rather than KPI CRUD, Evidence/interpretation distinction, Problem/Diagnosis/Design/Outcome/Reflection/Principle language, people/organizations as redesignable machines, AI roles, People-first thesis and minimal UI governance.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Identity/session, Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, RAGFlow, authenticated Knowledge Q&A, Brave + DeepSeek, provider controls, safe client projection and deployment-safety foundations.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Complete  
**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal Discovery is progressive and measures are optional. Reality is Goal-scoped Evidence + Observation. Problems and Principles remain AI-assisted but user-reviewed. Accepted Principles enter testing, never automatically trusted.

---

# Phase 3 — Design + Execution

**Status:** Complete  
**Merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`

```text
Problem → Diagnosis → Design → Actions → Outcome → Review / Reflection
```

Diagnosis separates symptom/proximate/root-cause hypothesis and preserves evidence/uncertainty. Design changes the machine rather than becoming a task list. Actions only execute Design. Outcome compares expected vs actual Reality and evaluates the Design only after observed Reality exists. Post-Outcome Review becomes a linked Reflection.

Final pre-merge verification: Foundation #154 ✅, Lint #489 ✅, Playwright #256 ✅.

---

# Phase 4 — Learning Engine + Self Model

**Status:** **Ready — verified, not merged**  
**Branch:** `phase/4-learning-self-model`

## Objective

Make Principles compound value from the person's own durable history without converting AI inference into fixed truth about identity.

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → test again
```

## Delivered

### Correctable Self Model

- Self Model is the set of accepted/revised Learning Pattern hypotheses, not traits or personality labels;
- Pattern requires at least two completed Reflection cases;
- user can inspect supporting cases, counter-evidence and uncertainty;
- unchanged AI wording records `accepted`; correction records `revised`; reject creates no Pattern row;
- stale pending proposals are superseded.

### Longitudinal integrity

- model receives ephemeral `C#` case keys and `P#` Principle keys rather than durable UUIDs;
- unknown/duplicate model keys fail;
- same-Problem before/after learning may be `design_learning` but not `recurring_pattern`;
- `recurring_pattern` requires at least two distinct Problems in AI validation and deferred PostgreSQL constraints;
- Pattern cases retain Workspace + Goal + Problem + Reflection semantics;
- each proposal considers the 8 most recent completed Reflection cases, presented chronologically;
- model-facing history text is bounded so context/cost does not grow without limit.

### Principle improvement

- accepted/revised active Pattern may propose one relevant Principle revision;
- user explicitly reviews/edits trigger, rule and rationale;
- before/after Principle wording is stored durably;
- Pattern→Principle provenance is retained;
- revised Principle returns to `revised + testing`, never trusted automatically;
- an already-applied Pattern revision cannot replay.

### UI / privacy

Authenticated `/learning` remains sparse: insufficient history, Find a pattern, progressive evidence disclosure, correction/rejection and compact durable Pattern hypotheses. No scorecard, chart, streak, trait feed or analytics dashboard.

Browser projection excludes Workspace IDs, Evidence UUIDs, AI Suggestion IDs and internal Goal/Problem join IDs.

## Audit findings corrected

- TypeScript ephemeral-key Map inference;
- client relabeling of same-Problem cases as recurring Pattern after AI validation;
- history selection that would eventually favor old cases;
- unbounded model-facing history text.

## Verification

Runtime head `4ae0d5cefc51b8137f943720f68bbac86175ac30`:

- Foundation #163 ✅ — PostgreSQL 16, migrations 0001–0004, typecheck, unit, serial real-Postgres integration, production build;
- Lint #498 ✅;
- Playwright #265 ✅ — authentication/insufficient-history boundary, full Phase 2 + 3 + 4 browser path, Pattern correction, Principle revision/reload/rejection, Knowledge privacy and normal scrolling.

## Expected versus actual outcome

**Expected:** at least one useful longitudinal Pattern can be traced to real cases, corrected by the user and used to improve future behavior or a Principle.

**Actual:** achieved on branch. A real browser path generates history through normal product use, creates an inspectable Pattern, corrects it, persists it as revised Self Model state, uses it to revise a Principle back into testing, reloads the state and rejects a later proposal.

## Limitations carried forward

- user-triggered learning only; no scheduled/proactive learning;
- 8 most recent completed Reflection cases per proposal rather than semantic retrieval over unlimited history;
- one Pattern→Principle revision in v1;
- Learning remains a secondary `/learning` surface;
- no personality testing, generic memory, organization learning or structured business connectors.

Phase 4 remains Ready because this request did not include merge.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

Begin only after Phase 4 is explicitly accepted/merged. Potential scope: Organization Workspace, people/roles/responsibilities/teams, culture signals, issues/disagreements, permissions/governance and contextual evidence-backed believability. Radical Transparency must coexist with authorization and accountability.

---

# Cross-phase invariants

- authorization before private retrieval/AI;
- evidence/provenance boundaries;
- observation ≠ inference;
- AI suggestion ≠ truth;
- public live search never receives private RAG excerpts;
- minimal UI without explanatory filler;
- database tenant/semantic invariants where practical;
- no resurrection of retired Council/V2 architecture without explicit product decision.

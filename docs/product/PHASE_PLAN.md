# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-09-08  
**Completed on `main`:** Phases 0–5  
**Current major phase:** **Phase 6 — Product Recenter / Evolution Engine — In progress**  
**Next major phase after Phase 6:** **Not defined**

## Phase execution protocol

```text
Understand requirements
  → lock goal / acceptance criteria
  → implement
  → audit
  → compare against goal
  → fix gaps
  → re-audit
  → production verification
  → close source of truth
  → report
```

`Complete` means the phase is accepted/merged, production is verified when applicable, and source-of-truth reflects the actual outcome. `Ready` means implementation and verification are complete on a branch but merge has not happened. `In progress` means an explicit product decision and acceptance contract exist and at least one implementation tranche has started.

## Program view

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Safe durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle produces durable user-owned learning. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → Outcome → Review turns learning into observed machine change. |
| 4 | Learning Engine + Self Model | **Complete** | Longitudinal history produces useful, inspectable and correctable Pattern hypotheses that can improve a Principle. |
| 5 | Principles for Organizations | **Complete** | A governed collective machine makes responsibilities, reality, disagreement and contextual track record explicit without people scoring. |
| 6 | Product Recenter / Evolution Engine | **In progress** | Recenter the product around Dream + Reality + Determination, 5 Steps, and Pain + Reflection → Progress using the proven kernel. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

Established the Principles Kernel, Goal as chosen desired Reality rather than KPI CRUD, Evidence/interpretation distinction, Problem/Diagnosis/Design/Outcome/Reflection/Principle language, people/organizations as redesignable machines, AI roles, People-first thesis and minimal UI governance.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Identity/session, Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, authenticated knowledge retrieval, live search, AI generation, provider controls, safe client projection and deployment-safety foundations.

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

---

# Phase 4 — Learning Engine + Self Model

**Status:** Complete  
**Merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
**Production deploy:** run `32838276392`

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → test again
```

Delivered a correctable Self Model, bounded recent-history retrieval, safe model-facing identifiers, semantic recurring-pattern constraints, safe client projection and explicit Pattern→Principle revision that returns a Principle to testing.

---

# Phase 5 — Principles for Organizations

**Status:** Complete  
**Merge:** `0fa12577636715437f3208e8289d71931433aa61`  
**Production deploy:** run `32844721161`

```text
Organization
  → People / Roles / Responsibilities / Teams
  → observed Issues
  → explicit Disagreements
  → contextual track-record evidence
  → accountable resolution
```

Delivered governed Organization Workspaces, owner/member authorization, machine structure, attributable Issues/Disagreements and contextual track-record evidence without global people scoring. Cross-organization references are constrained by PostgreSQL and browser contracts do not expose Workspace/User UUIDs.

Final pre-merge: Foundation #189 ✅ · Lint #524 ✅ · Playwright #291 ✅.  
Post-merge: Foundation #190 ✅ · Lint #525 ✅ · Playwright #292 ✅ · production `32844721161` ✅.

---

# Phase 6 — Product Recenter / Evolution Engine

**Status:** **In progress**  
**Started:** 2026-09-08  
**Architecture:** `docs/product/PHASE_6_ARCHITECTURE.md`

## Product decision

The existing kernel is functionally rich but the product experience is too modular and generic. Phase 6 makes the Ray-Dalio-inspired evolution logic the visible organizing system rather than leaving Goal, Reality, Problem, Execution, Reflection, Knowledge and Learning as loosely adjacent features.

Three nested ideas define the product:

```text
Dream + Reality + Determination → Successful Life
```

```text
5 Steps to Get What You Want
1 Goal
2 Problem
3 Diagnosis
4 Design
5 Do
```

```text
Pain + Reflection → Progress
```

These are mapped onto the durable kernel rather than implemented as a second data model:

```text
Dream / Goal
  → Reality
  → Problem
  → Diagnosis
  → Design
  → Do / Actions
  → Outcome
  → Pain / Surprise
  → Reflection
  → Principle
  → Learning
  → Reality again
```

## Objective

Make every primary surface feel like part of one evolution system:

- **People** — active personal evolution loop;
- **Organization** — the same loop applied to a governed collective machine;
- **Knowledge** — think from Principles and evidence, with explicit confirmed bridges to active state;
- **Learning** — longitudinal Patterns, Reflection opportunities and living Principles.

## Foundation tranche — contract + projection

The first tranche intentionally does not redesign the People UI yet.

It delivers:

- explicit Phase 6 architecture and acceptance contract;
- source-of-truth update;
- `EvolutionState` read contract;
- pure `projectEvolutionState(PeopleState, ExecutionState)`;
- `loadEvolutionState(workspaceId)` composed from existing repositories;
- authenticated read-only `GET /api/evolution/state`;
- unit coverage for state progression, coherent active lineage, 5-Step status and privacy projection.

No destructive migration and no `evolution_cycles` table are introduced in this tranche.

## Delivery sequence

```text
contract + EvolutionState projection
  → People recenter
  → 5 Steps completion
  → Pain + Reflection
  → Living Principles
  → Learning recenter
  → Knowledge recenter
  → Organization recenter
  → mobile/accessibility/visual audit
  → production verification
  → Phase 6 closeout
```

People is recentered before Organization so the personal kernel is proven once before it is applied to the collective machine.

## Definition of Done

Phase 6 is Complete only when:

- existing production history projects without re-entry;
- a new user can move through Dream → Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection → Principle;
- 5 Steps are the visible execution backbone rather than decorative progress labels;
- Action completion never substitutes for observed Outcome;
- Pain/Outcome can trigger Reflection;
- Reflection can produce no Principle when evidence is insufficient;
- Principles remain user-reviewed, revisable hypotheses under test;
- People makes current Reality and next action obvious without exposing internal ontology as the primary mental model;
- Knowledge does not silently write durable state;
- Organization reuses the same kernel without becoming HR or project-management software;
- authorization, evidence/provenance and safe browser projections remain intact;
- unit, real-Postgres integration, lint, build, Playwright, canary and exact-SHA production verification pass.

---

# Next major phase after Phase 6

**Status:** Not defined.

Do not infer Phase 7. A new major phase requires a separate explicit product decision, goal/acceptance contract and execution/audit loop.

---

# Cross-phase invariants

- authorization before private retrieval/AI;
- evidence/provenance boundaries;
- observation ≠ inference;
- AI suggestion ≠ truth;
- Action completion ≠ Outcome;
- Pain/Outcome + Reflection feeds learning;
- Principle = revisable hypothesis, not immutable truth;
- contextual track record ≠ identity-level people score;
- Radical Transparency does not bypass authorization;
- public live search never receives private personal-history excerpts;
- minimal UI without explanatory filler;
- database tenant/semantic invariants where practical;
- no resurrection of retired Council/V2 architecture without explicit product decision.

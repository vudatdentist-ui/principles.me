# Phase 6 Architecture — Product Recenter / Evolution Engine

**Status:** In progress — correction tranche  
**Start date:** 2026-09-08  
**Correction decision:** 2026-09-10  
**Baseline:** Phases 0–5 Complete on `main`

## 1. Goal

Phase 6 recenters Principles around one evolution system instead of adjacent database-shaped modules.

The product is organized around three nested ideas:

```text
Dream + Reality + Determination → Successful Life
```

```text
5 Steps to Get What You Want
1. Goal
2. Problem
3. Diagnosis
4. Design
5. Do
```

```text
Pain + Reflection → Progress
```

They map to one durable kernel:

```text
Goal
  → Reality
  → Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Reflection
  → Principle
  → Learning Pattern
  → Evolve
  ↺
```

Phase 6 changes orchestration and product language without discarding durable records proven by Phases 1–5.

## 2. Final personal product model: Me

The personal surface is named **Me**, not People.

Authenticated primary navigation is:

```text
Me · Organization · Knowledge · Learning
```

The internal `people` feature/API namespace may remain for backward compatibility. Product language should not expose that implementation detail.

Me answers:

1. What deserves attention now?
2. Which goals am I pursuing?
3. Where is each goal in the 5 Steps?
4. What is the next meaningful action for the selected goal?

Me is not limited to one active Goal. A person may pursue multiple Goals in parallel.

```text
Me
├── Goal A → its own Reality / Problem / Diagnosis / Design / Do / Outcome / Reflection
├── Goal B → its own Reality / Problem / Diagnosis / Design / Do / Outcome / Reflection
└── Goal C → its own Reality / Problem / Diagnosis / Design / Do / Outcome / Reflection
```

The default surface shows a small portfolio of goals and lets the user enter one goal lane at a time. It must not render every goal's entire ontology simultaneously.

## 3. Multi-goal projection

`EvolutionState` remains a read model over existing data, not a new system of record.

```text
PeopleState + ExecutionState
            ↓
     per-goal projection
            ↓
EvolutionState + Goal summaries
```

The contract exposes:

```ts
EvolutionState {
  goals[]
  selectedGoalId

  // selected goal lane
  dream
  reality
  problem
  diagnosis
  design
  actions
  outcome
  reflection
  principle
  fiveSteps
  stage
  attention
  nextAction
}
```

Each `goals[]` item is a compact summary with Goal identity, stage, current 5-Step, current Reality/Problem summary, attention count and next action.

A caller may request a specific lane with `goalId`. New-goal mode opens an empty Dream lane while preserving the existing portfolio.

No `evolution_cycles` table is introduced for this requirement. Existing goal-scoped foreign keys already provide the lineage boundary.

## 4. Per-goal lineage

Every Goal is projected independently:

```text
Goal
  → latest Reality for that Goal
  → active/latest Problem for that Goal
  → Diagnosis for that Problem
  → active/latest Design for that Diagnosis
  → Actions for that Design
  → Outcome for that Design
  → linked Outcome Review / Reflection
  → Principle originating from that Reflection
```

Records from another Goal must never replace a record in the selected goal lane simply because they are newer.

Default selection prefers an existing chosen Goal; explicit `goalId` selection overrides it. The UI preserves the user's selected Goal when mutations refresh state.

## 5. Stage and 5-Step semantics

```text
no Goal                         → dream
Goal, no Reality                → reality
Reality, no Problem             → problem
Problem, no Diagnosis           → diagnosis
Diagnosis, no Design            → design
Design with unfinished Actions  → do
Do complete, no Outcome         → outcome
Outcome, no linked Review       → reflection
Review exists                   → principle
```

Reality, Outcome, Reflection and Principle are part of the broader evolution loop but are not additional numbered steps.

Action completion is not success. Outcome requires observed Reality.

## 6. Principles are first-class user objects

Principles are not available only at the end of the currently selected Goal.

Learning owns a visible Principles library with two creation paths.

### User-authored Principle

A user may write a Principle directly:

```text
When <trigger>
Then <rule>
Why <optional rationale>
```

A manually authored Principle is an explicit user judgment, so it enters `testing` without pretending to be trusted truth.

It does not require an origin Reflection or AI suggestion.

### Distilled Principle

Any eligible completed Reflection with Goal + Problem context may be used to propose a Principle:

```text
Reflection
  → Distill principle
  → AI candidate
  → user accept / revise / reject
  → testing
```

AI still cannot silently create accepted durable truth. AI-distilled Principles remain user-reviewed candidates.

A Reflection does not have to produce a Principle.

## 7. Learning surface

Learning is the longitudinal home for:

```text
Principles
Reflections
Patterns
```

Default hierarchy:

- Principles under test are visible as a library, not only through one active Goal;
- completed Reflections remain available for Principle distillation;
- recurring Patterns remain evidence-backed, correctable hypotheses;
- supporting evidence, counter-evidence and uncertainty stay progressively disclosed.

Learning must not become a personality profiler, score dashboard or quote collection.

## 8. Copy and interaction rule

The repository UI principle is enforced literally:

> Do not use small explanatory text to compensate for unclear structure.

Primary surfaces prefer visible state and action:

```text
Diagnosis
No root cause yet.
[ Diagnose ]
```

not explanatory paragraphs about what diagnosis means.

The UI may retain concise semantic labels, source/provenance metadata, uncertainty and the three core Principles equations where they orient the user. It should remove filler copy, repeated philosophy, AI preambles and prose that merely narrates obvious controls.

Supporting reasoning belongs behind progressive disclosure.

## 9. Knowledge

Knowledge remains read-only with respect to personal durable state.

It is framed simply as:

```text
Think from principles.
```

Shared Principles RAG, bounded personal evolution context and public live search remain separately attributable.

Public live search receives only the public query, never private personal-history excerpts.

A completed answer may link back to **Me**, but does not auto-write Goal, Problem, Diagnosis, Reflection or Principle records.

## 10. Organization

Organization applies the same kernel to a collective machine:

```text
Dream
  → Reality / Issue
  → Problem
  → competing models / Disagreement
  → machine Design
  → accountable execution
  → Outcome / learning
```

Roles, responsibilities, teams and contextual evidence remain governed structure/evidence. They are not people scores.

The recentered surface should use direct state labels and progressive disclosure rather than explanatory prose.

## 11. Privacy and projection boundaries

The correction preserves all existing safety properties:

- authorization occurs before Workspace state is loaded;
- browser projections do not expose Workspace UUIDs or private Evidence UUIDs;
- one user's personal goals, observations, problems, reflections and principles remain tenant-isolated;
- shared Principles RAG access does not make personal Workspace state shared;
- no autonomous AI durable writes;
- no global people scores or fixed identity judgments.

## 12. Data strategy

No destructive migration is required.

Existing authoritative tables remain:

- `goals`;
- `observations`;
- `problems`;
- `diagnoses`;
- `designs`;
- `execution_actions`;
- `outcomes`;
- `reflections`;
- `principles`;
- Learning Pattern tables.

The existing `principles` schema already allows nullable origin Reflection / AI suggestion references, so user-authored Principles use the current model rather than introducing a parallel table.

## 13. Acceptance contract

The Phase 6 correction is complete only when all of the following are true:

- primary navigation reads `Me · Organization · Knowledge · Learning` on desktop and mobile;
- Me shows multiple non-retired Goals concurrently as compact goal lanes;
- a user can add another Goal without losing or replacing existing Goals;
- selecting one Goal projects only that Goal's Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection lineage;
- the full 5 Steps remain executable end-to-end for each Goal;
- Action completion never substitutes for Outcome;
- Learning exposes all active personal Principles, not only the selected Goal's current Principle;
- a user can manually add a Principle;
- a user can distill a Principle from any eligible completed Reflection;
- AI-distilled Principles still require review before testing;
- primary surfaces remove explanatory microcopy that is not required to understand state, act, reflect, or establish trust;
- Knowledge remains non-writing and keeps shared/personal/live grounding attributable;
- Organization remains governed and does not become a people-scoring product;
- mobile has no document-level horizontal overflow;
- unit, real-Postgres integration, typecheck, lint, build and Playwright gates pass;
- production deployment is verified against the exact merged SHA before Phase 6 is declared production-complete.

## 14. Non-goals

This correction does not introduce a generic task manager, OKR dashboard, personality scoring, global people ranking, raw chain-of-thought display, autonomous durable AI writes, a second parallel goal/cycle data model, decorative gamification or resurrection of retired Council / thinker-persona architecture.

## 15. Audit rule

```text
Understand requirements
  → lock acceptance contract
  → implement
  → test
  → audit copy and interaction hierarchy
  → fix gaps
  → merge only on green gates
  → verify exact production SHA
  → update source of truth
  → report
```

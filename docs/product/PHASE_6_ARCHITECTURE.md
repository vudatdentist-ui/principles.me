# Phase 6 Architecture — Product Recenter / Evolution Engine

**Status:** In progress  
**Start date:** 2026-09-08  
**Baseline:** Phases 0–5 Complete on `main`  
**First tranche:** product contract + read-only `EvolutionState` projection

## 1. Goal

Phase 6 recenters Principles around one coherent evolution system instead of a collection of adjacent product modules.

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

These are not three separate workflows. They are three views of the same durable kernel:

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

Phase 6 changes product orchestration and the user mental model first. It does not discard records proven by Phases 1–5.

## 2. Product thesis

A user should not have to understand the internal ontology to use Principles. The product should answer four questions immediately:

1. What do I really want?
2. What is actually true?
3. What stands between the two?
4. What is the next meaningful step?

When Reality produces pain, surprise, failure, or contradiction, the product should help the user reflect and turn useful learning into a revisable Principle.

```text
DREAM
What do I really want?

REALITY
What is actually true?

GAP / PROBLEM
Where does Reality miss the Dream?

DETERMINATION
Diagnose → Design → Do

OUTCOME
What actually happened?

PAIN / SURPRISE
What did Reality teach me?

REFLECTION
What should change in my model?

PRINCIPLE
What rule is worth testing next?
```

## 3. Three nested loops

### North-star equation

```text
Dream + Reality + Determination → Successful Life
```

- **Dream** is the desired Reality the person chooses to organize around.
- **Reality** is observed Reality, not optimism, fear, or AI inference.
- **Determination** is the disciplined work of confronting Problems, finding causes, designing a better machine, and executing it.
- **Success** is not task completion. It is Reality moving toward the chosen Dream.

The existing `goals` table continues to store Dream/Goal semantics. Durable tables are not renamed merely to rename UI concepts.

### Execution engine — 5 Steps

```text
1 Goal
  ↓
2 Problem
  ↓
3 Diagnosis
  ↓
4 Design
  ↓
5 Do
```

Mapping to the existing kernel:

- Goal → `goals`
- Problem → `problems`
- Diagnosis → `diagnoses`
- Design → `designs`
- Do → `execution_actions`
- Result of Do → `outcomes`

Outcome remains separate from Do. Completing Actions is not evidence that the Design worked.

### Learning engine — Pain + Reflection

Pain + Reflection is a feedback loop, not a sixth execution step.

Pain may be represented by a poor or mixed Outcome, a surprise, a repeated Problem, a challenged Principle, or an explicit user statement that something hurt or failed.

```text
Pain / Surprise
  ↓
Reflection
  ↓
Learning
  ↓
Principle candidate or Principle revision
  ↓
Testing again
```

A Reflection does not have to produce a Principle. Insufficient evidence should remain insufficient evidence.

## 4. Product surfaces after recenter

Authenticated primary navigation remains:

```text
People · Organization · Knowledge · Learning
```

### People

The personal evolution loop. Default state should show Dream, current Reality, active Gap/Problem, current 5-Step position, one next meaningful action, and any high-value Reflection or Principle-under-test attention.

People should not render the entire database ontology merely because records exist.

### Organization

The same kernel applied to a collective machine:

```text
shared Goal
  → collective Reality / Issue
  → Problem
  → Diagnosis
  → machine Design
  → accountable execution
  → Outcome
  → Reflection
  → organizational Principle
```

Roles, responsibilities, teams, disagreement, and contextual track record remain governed machine structure/evidence, not a separate HR product.

### Knowledge

Knowledge becomes a way to think from Principles rather than an isolated generic chat surface. It should increasingly support questions such as:

- What is Reality here?
- What Problem am I not confronting?
- Help diagnose the root cause.
- What would a better machine look like?
- Which Principle applies?
- What should I reflect on?

Knowledge may suggest connections to active state, but important durable writes still require explicit user confirmation.

### Learning

Learning becomes the longitudinal view of recurring Patterns, unresolved Reflection opportunities, Principles under test, challenged Principles, and evidence for/against current hypotheses. It must not become a personality profiler or score dashboard.

## 5. Phase 6 state model

Phase 6 introduces a read model called `EvolutionState`.

It is a projection over existing durable records, not a new system of record:

```text
PeopleState + ExecutionState
            ↓
    projectEvolutionState()
            ↓
       EvolutionState
            ↓
        future UI
```

The first tranche deliberately avoids a new `evolution_cycles` table. Existing production data must project into the new model without migration or re-entry.

## 6. `EvolutionState` contract

```ts
EvolutionState {
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

### Active lineage

The projection follows one coherent lineage:

```text
active Goal
  → latest Reality for Goal
  → active/latest Problem for Goal
  → latest Diagnosis for Problem
  → active/latest Design for Diagnosis
  → Actions for Design
  → latest Outcome for Design
  → Outcome Review / Reflection
  → Principle originating from Reflection
```

Unrelated newer records from another Goal or Problem must not replace records in the active lineage.

### Active Goal selection

For backward compatibility with current People behavior:

1. prefer the newest Goal whose status is `chosen`;
2. otherwise use the newest available Goal;
3. if no Goal exists, stage is `dream`.

Current repositories return the relevant collections newest-first except Actions, which are ordered by Design and position.

### Stage semantics

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

Legacy Reflection/Principle data does not allow the projection to skip missing Diagnosis, Design, or Do steps in the newer execution path.

### Five-Step semantics

Reality, Outcome, Reflection, and Principle are essential parts of the broader evolution loop but are not numbered as additional 5 Steps.

The projection exposes both broad `stage` and the 5-Step execution state. After all five Steps are complete, `fiveSteps.current` is `null` while broad stage may still be Outcome, Reflection, or Principle.

## 7. `nextAction` semantics

```text
dream       → Clarify your dream
reality     → Face reality
problem     → Name the problem
diagnosis   → Diagnose the root cause
design      → Design the machine
do           → Do the design
outcome     → Observe the outcome
reflection  → Reflect
principle   → Distill / review the principle
```

Once an accepted/revised Principle is under test, the next action returns to Reality rather than pretending the Principle is final truth.

## 8. Attention semantics

`EvolutionState.attention` is intentionally small. The first projection may surface only high-value states:

- `pain_needs_reflection` — Outcome exists without linked Outcome Review;
- `principle_needs_review` — a Principle candidate is pending;
- `principle_under_test` — an accepted/revised Principle is being tested.

This is not an analytics feed. Future UI should normally show one to three attention items at most.

## 9. Privacy and projection boundary

The Evolution projection preserves existing private-state invariants by composing the existing People and Execution client projectors before selecting the active lineage.

It must not expose:

- Workspace UUIDs;
- private Evidence UUIDs;
- Outcome Evidence UUIDs;
- Outcome Observation UUIDs removed by the existing Execution projection;
- model-provider internals;
- raw private retrieval chunks.

Direct Reality observation handles remain only where the existing People browser contract already treats them as client-safe inputs for confirmed follow-up actions. Phase 6 does not broaden that exposure.

Authorization occurs before loading Workspace state.

## 10. Data strategy

Phase 6 begins without a destructive migration. Existing durable records remain authoritative:

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

UI language may use `Dream`, `Do`, and `Progress`; database names do not need to change.

A later schema addition such as explicit Principle test events may be justified only after the recentered People loop proves the requirement.

## 11. First-tranche implementation

The foundation tranche contains:

1. this architecture/acceptance contract;
2. source-of-truth update declaring Phase 6 explicitly started;
3. `features/evolution/contracts.ts`;
4. pure `projectEvolutionState(people, execution)`;
5. `loadEvolutionState(workspaceId)` composed from existing repositories;
6. authenticated read-only `GET /api/evolution/state`;
7. unit coverage for stage progression, coherent lineage selection, five-step status, and private-identifier stripping.

This tranche intentionally does **not** replace the People UI yet.

## 12. Delivery plan after the foundation tranche

1. **People recenter** — replace stacked ontology cards with Dream / Reality / Gap / current 5-Step / next action.
2. **5 Steps completion** — make Diagnosis → Design → Do the visible execution backbone.
3. **Pain + Reflection** — outcome-triggered Reflection and explicit Progress state.
4. **Living Principles** — visible testing/challenged/revised lifecycle with inspectable evidence.
5. **Learning recenter** — Patterns, unresolved Reflection, Principles under test.
6. **Knowledge recenter** — Think from Principles + confirmed bridges into active state.
7. **Organization recenter** — apply the same evolution loop to the governed collective machine.
8. **Mobile/accessibility/visual audit**.
9. **Production verification and source-of-truth closeout**.

People is recentered before Organization so the kernel is proven once rather than duplicating an immature orchestration model.

## 13. Acceptance contract for Phase 6

Phase 6 is not Complete merely because the new UI looks better. It is Complete only when:

- an existing production user's history projects without re-entry;
- a new user can move through Dream → Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection → Principle;
- the 5 Steps are the visible execution backbone, not decorative progress labels;
- Action completion never substitutes for observed Outcome;
- Pain/Outcome can trigger Reflection;
- Reflection can produce no Principle when evidence is insufficient;
- Principles remain user-reviewed, evidence-backed hypotheses with testing/challenged/revised lifecycle;
- People communicates current Reality and next action without exposing internal ontology as the primary mental model;
- Knowledge can reason from shared knowledge plus bounded personal context without auto-writing durable state;
- Organization reuses the same kernel without becoming HR/project-management software;
- browser projections preserve authorization and private-identifier boundaries;
- mobile/desktop share one coherent application shell;
- real-Postgres integration, unit, lint, build, Playwright, canary, and exact-SHA production gates pass.

## 14. Non-goals

Phase 6 does not introduce a generic task manager, OKR dashboards, personality scoring, global people rankings, raw chain-of-thought display, autonomous durable AI writes, a second parallel data model just to support redesigned labels, decorative gamification, or resurrection of retired Council/thinker-persona architecture.

## 15. Audit rule

Every Phase 6 tranche uses the repository execution loop:

```text
Understand requirements
  → lock goal / acceptance contract
  → implement
  → audit
  → compare against goal
  → fix gaps
  → re-audit
  → production verification
  → update source of truth
  → report
```

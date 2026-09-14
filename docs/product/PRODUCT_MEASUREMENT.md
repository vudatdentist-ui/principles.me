# Principles product measurement

**Status:** current Phase 6 product-learning contract  
**Goal:** learn whether Principles changes behavior without turning intimate personal content into analytics data.

## 1. Measurement thesis

Principles stores unusually sensitive material: desired futures, observed Reality, Problems, Reflections, Principles and contextual organization evidence. Product learning must therefore prefer **behavioral event metadata** over content collection.

The analytics substrate is the existing `activity_events` table. The operator insight command reads only:

```text
workspace_id
event_type
happened_at
```

It does not read Goal text, Reality statements, Problem text, Reflection learning, Principle rules, evidence content, prompts, email or organization statements.

## 2. Current questions

The current product bottleneck is evidence of value, not implementation capacity.

We want to learn:

1. Can a new user move from a desire to a concrete recognized Gap/Problem?
2. How long does that take?
3. Do users return to Reflection on more than one day?
4. Do users close an empirical learning loop from observed Outcome into a reviewed Principle?
5. Where does the evolution path lose people?

These metrics do **not** prove that the product is useful. They identify where to investigate with direct user observation/interviews.

## 3. Activation

Current activation definition:

```text
Goal chosen
  → Reality observed
  → Problem recognized
```

The events must occur in that order for the same personal Workspace.

Why this boundary:

- account creation is not value;
- writing a Goal alone is still aspiration;
- Reality + Problem means the user has confronted a concrete gap that can be acted on.

Metric:

```text
activated workspaces / new workspaces in the analysis window
```

Treat this as a directional cohort signal, not a universal north-star percentage.

## 4. Time to first useful problem

Approximation:

```text
workspace.created → first problem.recognized
```

Report median seconds for workspaces that reach Problem.

This is intentionally named `medianSecondsToFirstProblem`, not `timeToValue`, because recognizing a Problem is a product hypothesis for value, not proof of value.

## 5. Reflection return

A Workspace is counted as a returning reflector when it has `reflection.completed` on at least two distinct UTC dates.

```text
repeat-reflection workspaces / workspaces with any Reflection
```

This avoids counting multiple edits/actions in one sitting as retention.

It is still not classic D1/D7 retention. If usage volume becomes meaningful, cohort retention should be introduced explicitly rather than inferred from this metric.

## 6. Full learning loop

Current conservative signal:

```text
outcome.reviewed
  → principle.accepted OR principle.revised
```

The Principle event must occur after the Outcome review for the Workspace.

This approximates the defining behavior:

```text
observed Outcome → Reflection → living Principle
```

It does not claim that the Principle improved the next decision. A later product-learning iteration may test whether the Principle is revisited/revised after new evidence.

## 7. Stage reach

Aggregate distinct Workspaces that reached:

```text
workspace
goal
reality
problem
diagnosis
design
do
outcome
reflection
principle
```

Use this as a drop-off map. Do not use it to rank individual users or employees.

## 8. Running the report

On an operator machine with database access:

```bash
pnpm product:insights 30
```

The optional argument is the number of days (1–365). Output is JSON suitable for manual review or a future privacy-safe dashboard.

Example fields:

```text
period
newWorkspaces
activatedWorkspaces
activationRate
medianSecondsToFirstProblem
workspacesWithReflection
repeatReflectionWorkspaces
reflectionReturnRate
fullLearningLoops
learningLoopRate
stageReach
```

## 9. Privacy rules

Never add these to product analytics/logs:

- Goal/Dream text;
- Reality or Problem statements;
- Diagnosis or Design prose;
- Action commitment text;
- Outcome narrative;
- Reflection text;
- Principle trigger/rule/rationale;
- evidence content/chunks;
- prompts/model responses;
- email addresses;
- organization Issue/Disagreement statements;
- raw IP/user agent when an aggregate scope is sufficient.

If a proposed metric requires intimate content, first ask whether the question can be answered with a semantic event instead.

## 10. Interpreting results

A metric is a pointer to a product question, not a target to game.

Examples:

- low Goal → Reality conversion: inspect whether Reality entry feels abstract or unsafe;
- strong activation but weak return Reflection: inspect whether the product helps during execution/outcome, not just initial thinking;
- many Actions but few Outcomes: inspect whether Do becomes a task manager and loses observed Reality;
- many Reflections but few Principles: this may be healthy when evidence is insufficient; do not optimize mechanically for Principle creation.

Qualitative observation remains necessary because the product's value is epistemic/behavioral, not just click completion.

## 11. Change rule

Any new metric/event must state:

1. product question it answers;
2. minimum fields required;
3. why those fields are not sensitive content;
4. retention need;
5. how the metric could be gamed or misread.

Raw content analytics requires an explicit product/privacy decision and is forbidden by default.

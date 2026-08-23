# Principles UI Principles

**Status:** required product constraint  
**Date:** 2026-08-23

Principles should feel like an intelligent system, not a management database exposed through forms and dashboards.

The product may be structurally complex inside. The interface should reveal only what the user needs to understand reality and take the next meaningful action.

## 1. Core rule

> **Do not use small explanatory text to compensate for unclear structure.**

If a screen needs paragraphs of helper copy to explain what the system is doing, the interaction is not yet designed well enough.

Whitespace is allowed to remain empty. It should communicate priority and calm rather than be filled with labels, descriptions, tips, or decorative microcopy.

## 2. Information hierarchy

Every primary screen should make these obvious without explanation:

1. What matters now?
2. What changed?
3. What needs attention?
4. What can I do next?

Supporting detail should be progressively disclosed.

The default state should show fewer items with stronger hierarchy rather than many items with weak hierarchy.

## 3. Text rules

### Primary text

Primary text carries meaning:

- goal;
- problem;
- reality statement;
- next action;
- outcome;
- question;
- principle.

It should be readable at a glance and never require tiny typography.

### Secondary text

Secondary text is permitted for metadata such as:

- timestamp;
- source type;
- owner;
- evidence count;
- confidence indicator;
- status;
- provenance.

Secondary text must not contain critical instructions or the main explanation of a screen.

### Avoid filler copy

Avoid sentences whose only purpose is to make an empty screen feel full, for example:

```text
Track your goals and stay aligned with the things that matter most to you.
```

Prefer an action or a state:

```text
What do you want?
```

or:

```text
Nothing needs attention.
```

## 4. Progressive disclosure

The default view should show the conclusion and the evidence boundary, not the entire reasoning structure.

Example:

```text
Founder independence
At risk

Hiring still depends on you.

Reflect
```

On demand, the user can open:

```text
Why?
Evidence
History
Related principle
```

The kernel may internally contain Goal, Observation, Problem, Diagnosis, Machine, Design, Activity Events, and Evidence. The user does not need to see all of those nouns on one screen.

## 5. AI interaction

AI should appear as system intelligence rather than a mascot or visible council of agents.

Good interactions:

```text
This has happened 4 times.
Reflect?
```

```text
Your stated priority is freedom.
Recent behavior has optimized for growth.

Review this tension?
```

```text
I don't have enough evidence to call this a root cause.

Check two possibilities?
```

Avoid:

- long AI preambles;
- excessive reassurance;
- explanations of obvious UI actions;
- fake certainty;
- chains of agent names or internal processing stages;
- displaying raw chain-of-thought.

## 6. Ask surface

A universal input can remain important, but it should become a way to interact with the system rather than the entire product.

Possible user inputs:

```text
I want the company to run without me.
```

```text
This week was frustrating because every hiring decision came back to me.
```

```text
What am I avoiding?
```

```text
Why is this problem repeating?
```

```text
What needs my attention today?
```

The system should translate natural language into kernel state when appropriate, with confirmation before important durable changes.

## 7. Home / Today principle

The home surface should not become an analytics dashboard.

It should answer:

> **What deserves attention now?**

A healthy future state may show only one to three items:

```text
Today

Company independence
At risk

Hiring still depends on you.

---

Project launch
On track

---

A pattern repeated this week.
Reflect
```

No requirement exists to fill the viewport.

## 8. Forms

Do not expose database schemas as forms.

Bad Goal creation:

```text
Title
Description
Metric
Target
Deadline
Priority
Category
Tags
```

Preferred Goal discovery:

```text
What do you really want?
```

Then the system asks only high-value clarifying questions required to distinguish goal, desire, trade-off, and success conditions.

Structured editors may exist later for power users, but they are not the primary mental model.

## 9. Empty states

An empty state may simply be empty plus one meaningful action.

Examples:

```text
No active problems.
```

```text
No principle has earned your trust yet.
```

```text
What do you want to change?
```

Avoid illustrations and multiple paragraphs unless they genuinely improve understanding.

## 10. Evidence and transparency

Evidence should remain inspectable without overwhelming the answer.

Default:

```text
3 sources · updated 5m ago
```

Expanded:

```text
RAG    Company hiring policy
LIVE   Current regulation
DATA   Hiring approvals
```

Critical source and uncertainty information must remain understandable and accessible, but it does not need to occupy the primary surface.

## 11. Status instead of explanation

Prefer visible state over explanatory prose.

Instead of:

```text
This goal may be at risk because progress is currently below the expected trajectory.
```

Prefer:

```text
At risk
```

with optional detail:

```text
Why?
```

Instead of:

```text
The AI is analyzing your previous reflections to determine whether this is a recurring issue.
```

Prefer:

```text
Pattern found · 4 similar cases
```

## 12. Visual character

The intended visual character is:

- calm;
- minimal;
- precise;
- premium;
- strong hierarchy;
- generous whitespace;
- low visual noise;
- small number of accent states;
- no decorative complexity pretending to be intelligence.

Dark or light appearance may evolve, but the hierarchy rules remain the same.

## 13. Interaction budget

Before adding any visible element, ask:

- Does it help the user understand reality?
- Does it help the user choose?
- Does it help the user act?
- Does it help the user reflect?
- Does it establish necessary trust or provenance?

If not, remove it.

## 14. Implementation review checklist

A feature is not UI-complete if:

- critical meaning lives in tiny helper text;
- the screen is full because empty space was considered a problem;
- the user sees internal ontology instead of a human question or state;
- the same concept is explained repeatedly;
- AI output is longer than necessary because the interface cannot represent state;
- every object is displayed as a card;
- every metric is displayed simply because it exists;
- the page requires a tutorial to understand the primary action;
- evidence is hidden completely;
- uncertainty is hidden completely.

A feature should feel as though the system has already done most of the organizational work before presenting anything to the user.

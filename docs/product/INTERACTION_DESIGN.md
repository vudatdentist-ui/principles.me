# Principles — Interaction Design Direction

**Status:** required design guidance for Phase 6 and later UI work  
**Intent:** make Principles feel like a living thinking system, not a database, dashboard, or collection of forms.

Read with:

- `PROJECT_CONTEXT.md`
- `docs/product/UI_PRINCIPLES.md`

## 1. Core interaction thesis

Interaction is not decoration added after layout.

Every meaningful interaction should help the user do at least one of these:

1. understand Reality;
2. see a tension or gap;
3. choose;
4. act;
5. reflect;
6. inspect evidence or uncertainty;
7. revise a living Principle.

If an interaction does none of these, remove it.

Animation alone is not interaction.

## 2. Experience sequence

The personal evolution surface should read as a connected narrative:

```text
Dream
  ↕
Reality
  ↓
Gap / Problem
  ↓
5 Steps
Goal → Problem → Diagnosis → Design → Do
  ↓
Outcome
  ↓
Pain / Surprise
  ↓
Reflection
  ↓
Principle under test
  ↺
```

The interface should make this relationship felt through composition and state change before explaining it in prose.

## 3. Dream and Reality

Dream and Reality are a tension pair, not two independent cards.

Preferred behavior:

- show them in direct visual relationship;
- keep both readable at the same time on wide screens;
- let progressive disclosure reveal Why / Success / provenance;
- make the gap between them visually consequential.

Avoid:

- generic summary cards;
- equal boxes that make Dream and Reality look like database records;
- charts or scores invented merely to quantify the gap.

## 4. Gap / Problem

The Gap is a narrative beat.

It should interrupt the page enough to answer:

> What stands between Reality and what I want?

Do not bury it among metadata.

Do not turn it into a red KPI tile.

## 5. Five Steps

The 5 Steps are the execution backbone, not a decorative progress tracker.

They should communicate:

- where the user is;
- what has already been established;
- what is still unknown;
- what action logically follows.

Completed steps should feel inspectable rather than merely checked off.

Current step deserves the strongest emphasis.

Upcoming steps should remain quiet.

Avoid gamification, completion percentages, streaks, or celebratory progress mechanics.

## 6. Current action

The current action is the primary working surface.

It should feel like the system has already organized the problem and is asking only the next high-value question.

Forms should not expose the schema.

Preferred:

```text
What is actually true?

[answer]

Record reality
```

Avoid:

```text
Observation title
Description
Source
Tags
Confidence
Category
```

## 7. Diagnosis

Diagnosis is an epistemic interaction.

The default view should emphasize the current root-cause hypothesis.

Supporting evidence, contradicting evidence, alternatives, and uncertainty should remain inspectable through progressive disclosure.

The visual design must not make an AI-generated hypothesis look settled merely because it is presented elegantly.

## 8. Design and Do

Design is a proposed machine change, not a project card.

Actions are commitments that execute that Design.

Completing an action should change visible state immediately, but should not imply that the Design worked.

Outcome remains separate.

## 9. Outcome comparison

Expected and Actual should be visibly comparable.

The comparison choice:

```text
improved · mixed · worse · unclear
```

is an explicit judgment interaction, not an analytics control.

Do not add charts unless observed data genuinely requires a chart.

## 10. Reflection

Reflection is one of the product's defining interactions.

```text
Pain + Reflection → Progress
```

should be experienced as a deliberate transition, not a generic textarea form.

Ask only what is required to distinguish:

- what hurt or surprised the user;
- what the experience taught them.

The screen should create enough visual quiet for reflection.

## 11. Principles

A Principle is a living hypothesis under test.

The interaction must make lifecycle visible:

```text
proposed → accepted for testing → tested / revised / rejected
```

Avoid the visual language of permanent rules, badges of achievement, or inspirational quote cards.

Revision should feel normal, not like failure.

## 12. Editorial composition

Prefer:

- typography;
- whitespace;
- sequence;
- alignment;
- tension between elements;
- hairline rules;
- state changes;
- progressive disclosure.

Before using:

- rounded cards;
- shadows;
- pills;
- badges;
- tinted containers.

Commodity controls may be conventional. Brand-defining surfaces should be composed rather than cardified.

## 13. Motion grammar

Motion is allowed only for:

### State transition
An accepted action visibly changes state.

### Relationship
Movement makes a relationship clearer.

### Orientation
A subtle transition helps the user understand where attention moved.

### Progressive disclosure
Expanded evidence/history appears without disorienting the user.

Do not use ambient floating objects, decorative parallax, glow effects, looping motion, or animation whose removal leaves the meaning unchanged.

Always respect `prefers-reduced-motion`.

## 14. Interaction density

Not every section should be interactive.

Use a rhythm of:

```text
read → act → breathe → inspect → decide → reflect
```

A product where everything moves or responds becomes noisy and less intelligent.

## 15. Mobile

Mobile must preserve the narrative sequence rather than compress desktop columns.

For Dream / Reality:

```text
Dream
  ↓
transition / tension marker
  ↓
Reality
```

For 5 Steps, horizontal exploration is acceptable when labels remain readable and the current step is obvious.

Touch targets must remain practical.

## 16. Review questions

Before considering a Principles interaction complete, ask:

1. What does the user understand after interacting that they did not understand before?
2. Does it expose product meaning or merely visual novelty?
3. Can the interaction be removed without losing meaning? If yes, remove it.
4. Is Reality or evidence being hidden for aesthetic simplicity?
5. Is AI uncertainty still visible where it matters?
6. Does the user see one clear next meaningful action?
7. Does the experience feel like Principles, or like a generic AI/SaaS UI?

If the answer to #7 is generic, redesign the composition before adding polish.

# Phase 4 — Learning Engine + Self Model

**Status:** Active implementation contract  
**Started:** 2026-08-24  
**Branch:** `phase/4-learning-self-model`  
**Base:** Phase 0–3 Complete on `main`

This document is the implementation, audit and acceptance contract for Phase 4.

Phase 4 adds a longitudinal learning layer on top of the durable People history already produced by Phases 2 and 3:

```text
History
  → Pattern hypothesis
  → inspect cases / counter-evidence / uncertainty
  → accept / revise / reject
  → revise a Principle when useful
  → test again in future Reality
```

The objective is not to produce a personality profile, insight feed or psychological score. The objective is to let Principles form a small number of evidence-backed, user-correctable hypotheses about recurring machine behavior and use those hypotheses to improve future Principles.

## 1. Product invariants

### Self Model means correctable hypotheses, not identity labels

The Self Model is the current set of accepted/revised Learning Patterns. A Learning Pattern describes something the available history suggests about cause-and-effect, behavior, machine constraints, Design effectiveness or Principle effectiveness.

It is not a statement of immutable identity.

The product must not turn observations into labels such as:

- "you are lazy";
- "you are a bad leader";
- personality-type claims presented as fact;
- clinical or mental-health diagnoses;
- demographic or other sensitive-attribute inference.

A valid pattern is phrased as a revisable hypothesis about observed situations, choices, machine behavior or outcomes.

### Longitudinal means more than one durable case

AI may not create a Phase 4 Pattern proposal from a single Reflection.

A proposal requires at least two distinct completed Reflections in the same Workspace. The model must be told whether those Reflections belong to:

- the same Problem observed at different times; or
- different Problems/cases.

It must not claim cross-case recurrence when the evidence only shows one Problem before/after an intervention.

### Observation and inference remain separate

The source history remains durable Reality state: Goals, Problems, Diagnoses, Designs, Outcomes, Reflections and Principles.

A Learning Pattern is an inference over that history. It must preserve:

- a concise pattern statement;
- an implication for future behavior or machine design;
- evidence that supports the hypothesis;
- evidence that weakens or contradicts it;
- uncertainty;
- optional confidence;
- the exact durable Reflection cases used to justify it.

AI output remains a proposal until the user accepts or revises it.

### The user can correct the model

The user must be able to:

- inspect the cases behind a proposal;
- edit the pattern before accepting it;
- reject a bad proposal;
- retain the edited wording as `revised`, distinct from accepting AI wording unchanged.

Rejected AI proposals remain auditable as rejected AI Suggestions; they do not become Self Model entries.

### Learning must have a behavioral use

An accepted/revised Pattern is not valuable merely because it sounds insightful.

Phase 4 must provide one concrete use path: an accepted/revised Pattern can inform a user-reviewed revision of an existing Principle.

Applying a learning-driven Principle revision must:

- require explicit user confirmation;
- preserve the previous Principle wording in durable revision history;
- link the revision to the Learning Pattern that informed it;
- move the revised Principle back into `testing`, because a changed Principle has to earn trust again;
- never mark a Principle `trusted` automatically.

### No analytics dashboard

Phase 4 does not add charts, scores, streaks, trait radar diagrams, insight feeds or a generic dashboard.

The primary Learning surface should answer one question:

```text
What is your history teaching you?
```

Only evidence-backed Patterns deserve visible space.

## 2. Durable Phase 4 slice

Migration 0004 may add only schema justified by the vertical slice.

### Learning Pattern

Required fields:

- workspace;
- creator;
- optional origin AI Suggestion;
- `kind`;
- pattern statement;
- implication;
- supporting-evidence summary;
- contradicting-evidence summary;
- uncertainty;
- optional confidence;
- acceptance state (`accepted` or `revised`);
- lifecycle state (`active`, `applied`, `challenged`, `retired`);
- applied timestamp when a Principle revision is applied.

Phase 4 v1 Pattern kinds:

- `recurring_pattern` — a repeated pattern across distinct cases;
- `design_learning` — what changed or persisted across a before/after Design cycle;
- `principle_effectiveness` — evidence about whether a Principle appears to help;
- `constraint_hypothesis` — a revisable hypothesis about a recurring personal machine constraint.

A single AI Suggestion may create at most one durable Learning Pattern.

### Pattern Cases

Each accepted/revised Pattern must link to at least two distinct completed Reflection cases.

The join must retain Workspace + Goal + Problem semantics so a case cannot be attached from another tenant or from the wrong Goal/Problem chain.

Client projection may expose a safe case summary and Reflection ID already used by existing People UI, but must not expose Evidence UUIDs, Workspace IDs or AI provenance IDs.

### Principle Revision History

Learning-driven Principle changes require durable history rather than silent in-place mutation with no record of the previous rule.

Each revision record keeps:

- workspace;
- Principle;
- Learning Pattern;
- previous trigger / rule / rationale;
- revised trigger / rule / rationale;
- actor;
- timestamp.

The Principle itself becomes the revised wording and returns to `testing`.

A Pattern may inform at most one revision of the same Principle in Phase 4 v1. Repeated future revisions may be added deliberately later when longitudinal revision UX is proven.

## 3. Learning case model

The Learning Engine loads completed Reflections server-side and enriches them from the existing durable chain when available.

A safe model-facing case may include:

```text
case key
Goal desired Reality
Problem statement
Reflection happened / expected / surprise / learning
whether the case is an Outcome Review
Diagnosis root-cause hypothesis, if available
Design machine change, if available
Outcome expected / actual / comparison, if available
```

Internal UUIDs are mapped to ephemeral keys such as `C1`, `C2`, `P1` before model generation.

The AI response refers only to those keys. The server resolves keys back to Workspace-scoped durable IDs before persistence.

The model must never invent a case key.

## 4. AI boundary

AI is allowed to:

- compare longitudinal durable cases;
- propose one Pattern hypothesis at a time;
- identify evidence for and against the hypothesis;
- explicitly state uncertainty;
- propose an implication;
- optionally propose a revision to one existing non-rejected/non-retired Principle when the historical cases actually support that link.

AI is not allowed to:

- generate a Pattern from fewer than two completed Reflections;
- infer immutable identity/personality as fact;
- make clinical/mental-health diagnoses;
- invent events, evidence or case keys;
- persist an accepted Pattern without user review;
- revise a Principle without user confirmation;
- auto-promote a Principle to trusted;
- use another Workspace's history.

Every Phase 4 AI mutation endpoint preserves the established boundary:

1. trusted same-origin mutation context;
2. authenticated owned Personal Workspace;
3. durable Workspace AI quota before provider work;
4. private history loaded server-side and Workspace-scoped;
5. structured model output validated before persistence;
6. model-facing ephemeral case/principle keys resolved server-side;
7. no internal Workspace/Evidence/AI provenance identifiers in browser projection;
8. durable user acceptance/revision before Pattern enters the Self Model.

## 5. Proposal lifecycle

```text
request Pattern
   ↓
server loads ≥2 completed cases
   ↓
old pending learning proposal superseded
   ↓
AI Suggestion: pending
   ↓
proposal shown with cases / uncertainty
   ├─ reject → AI Suggestion rejected, no Pattern row
   ├─ accept → Pattern accepted / active
   └─ edit   → Pattern revised / active
```

A pending proposal must be one-time consumable. Replay must not create duplicate Patterns.

`Try another` supersedes the previous pending Learning Suggestion so an old proposal cannot later be replayed accidentally.

## 6. Principle improvement lifecycle

When an accepted/revised Pattern includes a relevant existing Principle:

```text
Pattern active
  ↓
proposed Principle revision
  ↓
user inspect/edit
  ↓
confirm
  ↓
Principle revision history row
  + Pattern ↔ Principle provenance
  + Principle wording updated
  + lifecycle → testing
  + acceptance_state → revised
  + Pattern lifecycle → applied
```

If the Pattern has no defensible Principle target, the Pattern may still be accepted. The product should not force a revision for every insight.

## 7. Primary UI

Phase 4 adds a secondary authenticated `/learning` surface and one `Learning` navigation item alongside People and Knowledge.

The page remains sparse.

### Empty / insufficient-history state

Do not fabricate value.

If fewer than two completed Reflections exist:

```text
Learning
Not enough history yet.
```

No AI request button is shown until the minimum history exists.

### Ready state

```text
Learning
What is your history teaching you?
[ Find a pattern ]
```

### Proposal state

Emphasize only the hypothesis and implication.

Cases, supporting evidence, counter-evidence, uncertainty and confidence are progressively disclosed.

Actions:

```text
Keep this pattern
Edit
Reject
Try another
```

### Accepted Self Model state

Show accepted/revised Patterns as compact durable hypotheses, newest first.

Do not call them traits.

If a Pattern contains a defensible Principle revision target, show one next action:

```text
Revise this principle
```

The Principle revision form exposes trigger, rule and rationale and requires explicit confirmation.

## 8. Acceptance criteria

Phase 4 is Ready only if all criteria pass audit.

### Longitudinal proposal integrity

Real-Postgres and AI-boundary tests prove:

- fewer than two completed Reflections cannot request a Pattern proposal;
- only same-Workspace history is loaded;
- a proposal can distinguish same-Problem before/after learning from recurrence across distinct Problems;
- model case keys resolve only to the supplied Workspace-scoped cases;
- unknown/invented case keys are rejected;
- stale pending proposals are superseded on retry.

### Pattern persistence integrity

Real-Postgres tests prove:

- accepted/revised Pattern requires at least two distinct completed Reflections;
- Pattern cases cannot cross Workspace boundaries;
- Pattern cases cannot use the wrong Goal/Problem semantics for a Reflection;
- a single AI Suggestion cannot create multiple Patterns;
- proposal replay fails;
- accepting unchanged AI wording records `accepted`;
- editing material Pattern wording records `revised`;
- rejection creates no Self Model Pattern row and marks the AI Suggestion rejected.

### Correctability

Browser verification proves the user can:

- inspect the cases behind a proposal;
- edit and save a corrected Pattern;
- reject a proposal;
- reload and recover accepted/revised Patterns.

No Pattern becomes durable accepted Self Model state solely because AI proposed it.

### Principle improvement integrity

Real-Postgres tests prove:

- only accepted/revised active Patterns may drive Principle revision;
- Pattern and Principle must belong to the same Workspace;
- previous Principle wording is preserved in revision history;
- Pattern→Principle linkage is durable;
- the updated Principle becomes `revised` + `testing`;
- learning-driven revision never creates `trusted` state;
- replay of the same Pattern→Principle revision is rejected or idempotently prevented.

Browser verification proves a user can inspect/edit a proposed Principle revision, confirm it and reload the revised testing Principle.

### Privacy / client projection

Browser-facing Learning state excludes:

- Workspace IDs;
- Evidence UUIDs;
- AI Suggestion IDs;
- raw database metadata.

Safe case summaries may include Goal/Problem/Reflection/Outcome content already authorized to that user.

### UI

Browser verification proves:

- People, Knowledge and Learning navigation remains small;
- `/learning` shows no pattern-generation action before enough history exists;
- proposal details use progressive disclosure;
- no personality score/dashboard/trait feed is introduced;
- normal document scrolling remains intact.

## 9. Explicit non-goals

Phase 4 does not add:

- personality tests or psychometric scoring;
- mental-health diagnosis;
- immutable trait labels;
- gamification/streaks/XP;
- charts or analytics dashboards;
- proactive notifications/reminders;
- generic conversation memory;
- vectorized personal memory outside existing RAGFlow;
- autonomous Principle trust promotion;
- automated machine redesign without user confirmation;
- Organization/team models;
- CRM/finance/HR connectors;
- generic Projects or task-management breadth.

## 10. Expected outcome

**Expected:** Principles can take a real user's durable history, surface one evidence-backed and correctable longitudinal Pattern, show exactly which cases support it, preserve counter-evidence/uncertainty, and let the user use accepted learning to revise a Principle that must be tested again.

If successful, Principles starts compounding value from history without pretending that AI has discovered a fixed truth about the person.

## 11. Audit protocol

This Phase executes:

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

The current user request does not include merge. Phase 4 may become **Ready** on its branch/PR after final verification; it becomes **Complete** only after a later explicit merge and source-of-truth closeout on `main`.

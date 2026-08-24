# Phase 3 — Design + Execution

**Status:** Active implementation contract  
**Started:** 2026-08-24  
**Branch:** `phase/3-design-execution`  
**Base:** Phase 0–2 Complete on `main`

This document is the implementation, audit and acceptance contract for Phase 3.

Phase 3 continues the 5-Step Process from a recognized Problem into an observed machine change:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

The objective is not to add project-management breadth. The objective is to prove that Principles can turn a recognized gap into a reasoned change to the user's machine, execute the minimum required commitments, observe what actually happened, and learn from the difference between expectation and reality.

## 1. Product invariants

### Diagnosis is not a solution

A Diagnosis is a cause-and-effect hypothesis explaining why a recognized Problem exists.

It must preserve:

- the visible symptom;
- a proximate cause;
- a root-cause hypothesis;
- evidence that supports the hypothesis;
- evidence that contradicts or weakens it;
- plausible alternatives;
- uncertainty;
- confidence.

The product must be able to say that evidence is insufficient. AI output remains a proposal until the user confirms or revises it.

The system must not collapse:

```text
Problem → task
```

into the primary workflow.

### Design changes the machine

A Design is a proposed change to the system that repeatedly produces the outcome.

For Principles for People, the machine may include habits, routines, environment, relationships, capabilities, resources, decision rules and constraints.

A Design must retain:

- the machine change;
- why that change addresses the accepted Diagnosis;
- the expected result;
- a success signal that can later be compared with Reality.

A Design may contain Actions, but it is not reducible to an Action list.

### Actions exist only to execute a Design

Phase 3 adds only the minimum execution primitive required by the loop:

- a concise commitment;
- pending/completed/cancelled state;
- completion time when completed.

There is no generic inbox, assignee matrix, kanban board, sprint, dependency graph, estimate system or project-management shell in this phase.

### Outcome is Reality, not completion

Completing Actions does not prove the Design worked.

Outcome records:

- the expected result snapshot from the Design;
- what actually happened;
- a user-owned comparison: `improved`, `mixed`, `worse`, or `unclear`;
- durable Evidence + accepted Observation representing the reported result.

The Outcome must stay linked to the same Goal, Problem, Diagnosis and Design chain.

### Review closes the learning loop

After Outcome, the user completes a short Review/Reflection.

The UI should ask only what is still valuable, normally:

- what surprised you about the result?;
- what did this result teach you?

Expected and actual result are prefilled from the Outcome rather than asked again.

The resulting Reflection is durably linked to the Outcome and therefore can become evidence for later Principle revision and Phase 4 longitudinal learning.

## 2. Durable Phase 3 slice

Migration 0003 may add only the schema justified by this loop.

### Diagnosis

Required durable fields:

- workspace;
- Goal;
- Problem;
- optional origin AI Suggestion;
- symptom;
- proximate cause;
- root-cause hypothesis;
- supporting evidence summary;
- contradicting evidence summary;
- alternative hypotheses;
- uncertainty;
- optional confidence;
- acceptance state (`accepted` or `revised`).

A single AI suggestion may create at most one Diagnosis.

### Design

Required durable fields:

- workspace;
- Goal;
- Problem;
- Diagnosis;
- optional origin AI Suggestion;
- machine change;
- rationale;
- expected result;
- success signal;
- acceptance state (`accepted` or `revised`);
- lifecycle state (`active`, `evaluated`, `retired`).

A single AI suggestion may create at most one Design.

### Action

Required fields:

- workspace;
- Design;
- concise commitment;
- status (`pending`, `completed`, `cancelled`);
- completed timestamp when completed.

Phase 3 Actions are owned implicitly by the Personal Workspace user. Do not introduce organization assignment concepts early.

### Outcome

Required fields:

- workspace;
- Goal;
- Problem;
- Diagnosis;
- Design;
- expected result snapshot;
- actual result;
- comparison (`improved`, `mixed`, `worse`, `unclear`);
- linked Evidence;
- linked accepted Observation;
- observed timestamp.

Outcome persistence must be atomic with its Evidence + Observation provenance.

### Reflection extension

Reflection may gain an optional `outcome_id`.

Database constraints must make it impossible to link an Outcome Review to a different Goal or Problem inside the same workspace.

## 3. AI boundary

AI is allowed to:

- propose a Diagnosis from the selected Goal, Problem, Reality evidence and existing Reflection;
- propose a machine Design from an accepted Diagnosis;
- propose a small set of execution Actions as part of the Design proposal.

AI is not allowed to:

- persist an accepted Diagnosis without user confirmation;
- silently convert a Diagnosis into a remedy;
- invent supporting evidence;
- mark an Action complete;
- decide whether an Outcome improved Reality;
- auto-promote a Principle to trusted.

Every Phase 3 AI mutation endpoint must preserve the Phase 1/2 boundary:

1. trusted same-origin mutation context;
2. authenticated owned Personal Workspace;
3. durable workspace AI quota before provider work;
4. private context loaded server-side and workspace-scoped;
5. structured model output validated before persistence;
6. internal workspace/evidence identifiers excluded from browser projection;
7. durable user confirmation/revision before accepted Diagnosis or Design state.

## 4. Primary UI

The interface remains sparse.

Phase 2's completed Goal / Reality / Problem / Reflection / Principle state stays compact. Once the initial learning loop has been reviewed, the active change loop is:

```text
Diagnose → Design → Do → Outcome → Review
```

Only one primary next action should dominate the page.

### Diagnosis UI

Default state:

```text
Diagnose
[ Diagnose root cause ]
```

A proposal emphasizes the root-cause hypothesis. Symptom, evidence against/for, alternatives and uncertainty are progressively disclosed. The user can confirm or edit before persistence.

### Design UI

Default state:

```text
Design
[ Design the machine ]
```

The proposal emphasizes the machine change and expected result. Actions appear as a short editable execution list, not a task-management view.

### Do UI

Show only the Actions for the active Design. Completion is a direct interaction. No dashboard filler.

### Outcome UI

Once executable Actions are completed or cancelled, ask:

```text
What actually happened?
```

Then require one comparison choice:

```text
Improved / Mixed / Worse / Unclear
```

The expected result remains visible for comparison.

### Review UI

Ask one short question at a time. Do not display a journal form or explanatory paragraphs.

## 5. Acceptance criteria

Phase 3 is Ready only if all of the following pass audit.

### End-to-end behavior

A real authenticated browser flow can:

1. begin from the durable Phase 2 Goal → Reality → Problem → Reflection → reviewed Principle state;
2. request a Diagnosis proposal;
3. inspect and confirm or revise the root-cause hypothesis;
4. request a Design proposal tied to that accepted Diagnosis;
5. confirm or revise the machine change and its small Action set;
6. complete the required Actions;
7. record actual Outcome Reality and compare it to the Design expectation;
8. complete a post-Outcome Review/Reflection;
9. reload and recover the complete durable chain.

### Diagnosis integrity

Real-Postgres tests prove:

- cross-workspace Problem/Goal/Evidence identifiers cannot create or read a Diagnosis;
- same-workspace wrong-Goal Problem pairing is rejected;
- AI suggestion replay cannot create duplicate Diagnoses;
- accepted/revised state reflects whether user text differs from the proposal;
- Diagnosis can represent uncertainty and contradictory evidence rather than pretending certainty.

### Design integrity

Real-Postgres tests prove:

- Design must link to the same Goal + Problem + Diagnosis chain;
- cross-workspace links fail;
- one AI suggestion cannot create multiple Designs;
- Design + initial Actions persist atomically;
- user revision is recorded distinctly from accepting the AI proposal unchanged.

### Execution integrity

Real-Postgres tests prove:

- Actions cannot cross workspace/Design boundaries;
- completion state is durable and records completion time;
- Outcome cannot be recorded while active Actions remain pending;
- cancelled Actions do not falsely count as completed work, but do allow the design to proceed to evaluation when no pending Actions remain.

### Outcome integrity

Real-Postgres tests prove:

- Outcome is tied to the matching Goal + Problem + Diagnosis + Design;
- Outcome + Evidence + Observation persist atomically;
- cross-workspace or same-workspace semantic mismatches roll back;
- the Design becomes `evaluated` only after a valid Outcome;
- Action completion alone never marks the Design successful.

### Review integrity

Real-Postgres tests prove:

- Outcome Review Reflection must point to the matching Goal + Problem;
- wrong-Goal/wrong-Problem links fail at the database layer;
- post-Outcome Reflection persists the expected/actual comparison context;
- Phase 2 pre-execution Reflection remains distinguishable from Phase 3 Outcome Review.

### Client/privacy boundary

The browser receives the minimum durable state required to render the loop. Internal workspace IDs, Evidence UUIDs and AI provenance IDs remain server-side.

### UI

Browser verification proves:

- the full Phase 2 + Phase 3 path works without database editing or developer intervention;
- normal document scrolling remains intact;
- no explanatory microcopy wall or generic task-management shell is introduced;
- reload recovers the current active stage.

## 6. Explicit non-goals

Phase 3 does not add:

- generic Projects;
- kanban/list/calendar task products;
- teams or action assignment;
- recurring task automation;
- notifications/reminders;
- Diagnosis knowledge graph;
- multi-agent Council behavior;
- organization permissions;
- longitudinal Self Model;
- automatic Principle trust promotion;
- CRM/HR/Finance modules.

These remain future work only when a later phase requires them.

## 7. Expected outcome

**Expected:** Principles can take one recognized meaningful Problem, form a user-reviewed root-cause hypothesis, redesign the relevant personal machine, execute a minimal set of commitments, observe whether Reality actually changed, and convert the result into a new Reflection.

If successful, the product will no longer stop at insight. It will have a durable path from understanding to changed behavior/system and back to learning.

## 8. Audit protocol

This Phase must execute:

```text
Understand requirements
  → define acceptance criteria
  → implement
  → audit
  → fix
  → re-audit
  → final output check
  → merge
  → report
```

Phase 3 becomes Complete only after merge to `main` and source-of-truth closeout records actual outcome, limitations, verification evidence and the Phase 4 boundary.

# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-23  
**Rule:** only one major phase is active at a time.

This plan translates the Principles Kernel into a sequence of large product phases. Each phase must reach its intended behavioral outcome before the next phase becomes active.

A phase is not complete because code exists. A phase is complete only when:

1. the intended user loop works end-to-end;
2. security and data boundaries required by that phase are enforced;
3. automated verification covers the critical path;
4. the expected outcome has been evaluated against real or representative use;
5. `PROJECT_CONTEXT.md` is updated with actual progress and outcome;
6. unresolved compromises are recorded rather than hidden.

## Progress states

- **Planned** — defined but not started.
- **Active** — current major implementation focus.
- **Ready** — implementation/spec work is complete on a branch/PR and awaiting acceptance/merge.
- **Complete** — merged, verified, and the phase outcome has been recorded in product context.
- **Blocked** — cannot responsibly continue until a named dependency or decision is resolved.

## Program view

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | Ready | Shared product language, invariants, UI constraints, and phase rules are explicit before schema work. |
| 1 | Secure Platform + Durable Kernel | Planned | A user can safely own durable personal state and the system can store the first kernel primitives with provenance. |
| 2 | Principles for People — First Complete Loop | Planned | One person can move from meaningful Goal -> Reality -> Problem -> Reflection -> Principle in a minimal interface. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes, and review. |
| 4 | Learning Engine + Self Model | Planned | Principles can identify recurring patterns and improve suggestions from longitudinal evidence without turning inference into fixed truth. |
| 5 | Principles for Organizations | Planned | The same kernel supports collective goals, people/culture machine design, disagreement, roles, permissions, and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Ready  
**Implementation branch:** `product/principles-kernel-v1`

## Objective

Prevent Principles from becoming conventional productivity software with Ray Dalio terminology layered on top.

Define the philosophical core, domain language, AI boundaries, UI constraints, and sequencing rules before durable domain schema work begins.

## Scope

- Principles Kernel specification.
- Goal defined as a chosen desired reality, not a KPI object.
- Reality/evidence distinction.
- Problem, Diagnosis, Design, Outcome, Reflection, Principle definitions.
- Machine concept for People and future Organizations.
- AI roles: Observe, Challenge, Diagnose, Design, Reflect.
- People-first product thesis and Organization extension model.
- UI principle: minimal hierarchy, progressive disclosure, no filler microcopy.
- Major phase plan and Definition of Done.

## Explicitly not included

- database schema;
- authentication implementation;
- Goal CRUD;
- task/project implementation;
- organization membership;
- production UI redesign beyond current Q&A baseline.

## Definition of Done

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md` exists and is accepted.
- `docs/product/UI_PRINCIPLES.md` exists and is accepted.
- this phase plan exists.
- `PROJECT_CONTEXT.md` reflects the new product thesis and phase process.
- `ROADMAP.md` points to the phased program rather than a generic list of possible modules.

## Expected outcome

Any engineer or AI coding agent should be able to answer:

- What is Principles building?
- What is a Goal in this product?
- What is Reality versus a Belief?
- Why is Reflection not a journal feature?
- Why is Principle a durable living object?
- Why are People and Organizations on the same kernel?
- What should the UI hide by default?
- Which major phase is currently active?

without relying on deleted V2 history or prior chat context.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Planned

## Objective

Create the smallest secure platform on which personal Principles state can exist safely and durably.

The goal is not to implement the whole kernel. The goal is to establish ownership, identity, provenance, event history, and the first durable domain slices without creating speculative abstractions.

## Required decisions before implementation

- authentication approach;
- Postgres production topology and migration strategy;
- session model;
- personal workspace semantics;
- authorization boundary;
- server/client evidence projection;
- application rate-limit / quota boundary for `/api/ask` and future AI mutations.

## Initial durable capabilities

Expected minimum:

- User identity.
- Personal Workspace.
- Workspace membership/ownership foundation that can later extend to Organizations.
- Activity Event stream.
- Durable Goal state sufficient for Phase 2 discovery, without trying to model every future Goal field.
- Durable Evidence/Observation provenance boundary where required by Phase 2.
- Durable Reflection and Principle candidate records sufficient for a first loop.
- AI suggestions with acceptance state and provenance.

The exact table/schema design is decided during this phase from the kernel specification, not copied from legacy V2.

## Security requirements

- `/api/ask` is authenticated before private workspace deployment.
- retrieval is workspace-scoped before model access.
- browser receives a safe citation projection rather than unrestricted internal evidence objects.
- public live search never receives private RAG content.
- rate limits/quotas bound provider spend and abuse.
- cross-workspace access tests exist before Organization work begins.

## UI scope

Minimal account/workspace state only.

Do not build a settings-heavy shell or large navigation framework. Product UI beyond necessary identity/workspace interactions belongs to Phase 2.

## Definition of Done

- a user can sign in and has a personal workspace;
- durable kernel state is isolated by workspace;
- `/api/ask` operates inside an authenticated workspace boundary;
- critical private evidence is not indiscriminately streamed to the browser;
- AI/provider usage is bounded by an application-level rate/usage mechanism;
- migrations, health checks, tests, and production rollback are defined;
- `PROJECT_CONTEXT.md` records the actual architecture and trade-offs.

## Expected outcome

Principles can safely begin learning about a real person without creating ambiguous ownership, privacy, or provenance debt.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Planned

## Objective

Ship the smallest experience that proves Principles is an evolution system rather than a chatbot or goal tracker.

The complete loop for this phase is:

```text
Goal Discovery
    -> Reality
    -> Problem
    -> Reflection
    -> Principle Candidate
```

Diagnosis and execution may appear lightly when necessary, but deep Design/Action workflow is reserved for Phase 3.

## Core user story

A user can say something meaningful such as:

> I want to build a company that can operate without depending on me.

Principles helps clarify the chosen desired reality, observes or captures relevant reality over time, surfaces a meaningful gap, supports a short reflection, recognizes repeated patterns where evidence exists, and proposes a principle candidate that the user can accept, reject, revise, or leave untrusted.

## Goal Discovery requirements

The experience must be able to distinguish:

- Goal from desire;
- desired reality from proxy metric;
- why the Goal matters;
- competing Goals;
- explicit trade-offs;
- non-negotiable boundaries;
- success conditions and measures.

The user should not be forced through a long form. AI asks only the highest-value unresolved question.

## Reality requirements

Reality can initially come from:

- user statements;
- existing private RAG;
- existing Brave live search when public current context matters;
- Activity Events created inside Principles.

Structured business connectors are not required yet.

## Reflection requirements

Reflection should support:

```text
What happened?
What did you expect?
What surprised or hurt?
Is this recurring?
What might this teach us?
```

The screen does not need to display all these questions simultaneously.

## Principle candidate requirements

A principle candidate must retain:

- situation/trigger;
- proposed rule;
- rationale;
- supporting case/evidence links;
- confidence/trust lifecycle;
- user acceptance state.

AI-generated principles must never immediately become trusted truth.

## UI requirement

This phase is the first major redesign away from a Q&A-only root surface.

The interface should remain sparse. Likely primary moments are:

- Today / attention;
- Goal;
- Reality / problem;
- Reflect;
- Principles.

Exact navigation is validated during the phase and is not pre-committed.

## Definition of Done

At least one realistic People scenario can complete the loop end-to-end without requiring direct database editing or developer intervention.

The user can:

- discover and commit to a meaningful Goal;
- see why Principles believes a Reality statement;
- recognize a Problem relative to that Goal;
- reflect without writing a long journal entry;
- accept/reject/revise a Principle candidate;
- inspect evidence when needed;
- understand the primary screen without helper paragraphs or tiny instructional copy.

## Expected outcome

Principles begins accumulating high-quality, user-owned learning rather than only answering questions.

---

# Phase 3 — Design + Execution

**Status:** Planned

## Objective

Close the 5-Step loop from diagnosed Problem to changed machine and observed Outcome.

## Core loop added

```text
Problem
  -> Diagnosis
  -> Design
  -> Actions
  -> Outcome
  -> Review / Reflection
```

## Diagnosis requirements

- distinguish symptom, proximate cause, and root-cause hypothesis;
- preserve alternatives and uncertainty;
- connect claims to evidence;
- allow explicit "we do not know yet" state;
- search past cases for related patterns.

## Design requirements

Design is a machine change, not merely a checklist.

Possible changes:

- habit;
- process;
- ownership;
- rule;
- environment;
- cadence;
- resource allocation;
- system configuration;
- escalation path.

AI should connect every recommended design to the root cause it is intended to address.

## Execution requirements

Introduce only the task/project primitives needed to execute designs reliably:

- action;
- owner;
- due/sequence where useful;
- state;
- completion evidence;
- design/goal/problem relationship.

Do not compete with full project-management products by feature count.

## Today

A Today surface becomes valuable here.

It should show a small number of items requiring attention rather than a universal feed.

## Definition of Done

A user can take a diagnosed repeated problem, design a change to the machine, execute it, and later compare actual results with expected outcomes.

## Expected outcome

Principles can help create behavior change and machine change, not just insight.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned

## Objective

Use longitudinal evidence to make Principles meaningfully more useful over time.

## Capabilities

- repeated-problem detection;
- repeated-pain pattern detection;
- 5-Step failure-pattern analysis;
- stated-priority versus observed-behavior tension detection;
- principle effectiveness history;
- recurring diagnosis and machine-change patterns;
- evolving strengths/capabilities/weakness candidates;
- explicit uncertainty and user correction.

## Self Model rule

The model must describe observations and patterns before reducing people to traits.

Prefer:

> In 5 recent cases, difficult conversations were delayed after the problem was already identified.

Avoid:

> You are conflict-avoidant.

The first statement is evidence-backed and revisable. The second risks turning inference into identity.

## User correction

Every meaningful pattern needs a correction path.

Corrections become evidence about the model itself.

## Principle evolution

The system should be able to show:

- where a principle has worked;
- where it failed;
- when it should be challenged;
- whether exceptions are emerging;
- whether a new case reinforces or weakens confidence.

## Definition of Done

Principles can surface at least one useful longitudinal pattern that the user can trace to cases, correct if wrong, and use to change future behavior or a principle.

## Expected outcome

The product develops compounding value from the user's own experience rather than resetting to a stateless AI conversation each time.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

## Objective

Extend the proven People kernel to a collective machine without weakening privacy, governance, or truth-seeking.

## New organization dimensions

- Organization Workspace.
- People.
- Roles.
- Responsibilities.
- Teams.
- Culture signals.
- Issues.
- Disagreements.
- Decision rights.
- Governance.
- Domain-specific believability.
- Organization-level Goals, Problems, Designs, Outcomes, Reflections, and Principles.

## Organization machine

The system treats the organization as a machine composed primarily of people and culture, supported by roles, processes, systems, incentives, and governance.

Problems should be diagnosable as machine problems rather than merely assigned to individuals.

## Truth and transparency

The organization must enable important truth to surface while preserving legitimate permissions.

This phase explicitly rejects both:

- "everyone sees everything";
- "only hierarchy decides what is true."

## Believability

Believability is domain-specific and evidence-backed.

It must never become a global human-worth score.

Inputs may include:

- relevant experience;
- track record in comparable cases;
- calibration of prior predictions;
- quality of causal reasoning;
- willingness to revise beliefs when evidence changes.

## Definition of Done

A small real team can use Principles to:

- share a Goal;
- surface a meaningful Problem or disagreement;
- inspect evidence under correct permissions;
- identify whose relevant experience matters;
- diagnose a machine problem;
- assign a design/owner;
- observe an outcome;
- reflect and update an organizational Principle;
- do this without exposing private data outside authorization boundaries.

## Expected outcome

Principles becomes a collective evolution system built on the same kernel proven for individuals.

---

# Phase transition protocol

At the end of every phase:

1. run technical verification and critical-path product tests;
2. record what was actually built;
3. record what was intentionally deferred;
4. compare actual result with the phase's expected outcome;
5. update `PROJECT_CONTEXT.md` with:
   - completed phase;
   - actual architecture;
   - progress;
   - achieved outcome;
   - known limitations;
   - next active phase;
6. update this document's progress table;
7. only then begin the next major phase.

This protocol is mandatory because the product model is expected to evolve as it meets reality. The roadmap itself must be allowed to learn.

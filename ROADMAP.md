# Principles roadmap

**Date:** 2026-08-23

Principles is being built as an **evolution system for people first and organizations second**.

The current production-code baseline is hybrid **RAGFlow + Brave live search + DeepSeek Q&A**. The next product work is not a generic management module. It is the phased construction of the Principles Kernel defined in `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`.

Detailed phase scope, Definition of Done, and expected outcomes live in `docs/product/PHASE_PLAN.md`.

## Build rule

Only one major phase is active at a time.

A phase is complete only when:

- its intended user loop works end-to-end;
- required security/privacy boundaries work;
- critical paths are tested;
- actual outcome is compared with expected outcome;
- `PROJECT_CONTEXT.md` is updated with progress, actual architecture, limitations and next phase.

## Phase 0 — Kernel Definition

**Status:** Ready for review

Defines:

- Dreams + Reality + Determination as the aspiration/reality/execution frame;
- the 5-Step Process as the operating algorithm;
- Pain + Reflection = Progress as the learning loop;
- supporting mechanisms: Radical Truth, Radical Open-Mindedness, higher-level machine perspective, and living principles;
- the People-first / Organizations-later product model;
- Goal, Reality, Evidence, Belief, Problem, Diagnosis, Machine, Design, Outcome, Reflection, Principle and Activity Event as conceptual primitives;
- AI roles and provenance boundaries;
- UI principles;
- sequential phase governance.

Expected outcome: the product can no longer drift into conventional task/OKR/chatbot architecture without explicitly contradicting the source-of-truth context.

## Phase 1 — Secure Platform + Durable Kernel

**Status:** Planned

Build the smallest secure foundation for real personal state:

- identity/session;
- Personal Workspace;
- authorization and workspace isolation;
- Postgres and migration strategy;
- Activity Event history;
- minimal durable kernel state needed by Phase 2;
- AI suggestion provenance/acceptance;
- safe server/client evidence projection;
- `/api/ask` authentication and workspace scope;
- rate/usage controls for AI/search providers.

Expected outcome: Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

## Phase 2 — Principles for People: First Complete Loop

**Status:** Planned

Ship the first product loop:

```text
Goal Discovery
  -> Reality
  -> Problem
  -> Reflection
  -> Principle Candidate
```

The Goal experience must distinguish a chosen desired reality from desires, proxy metrics, competing priorities and accepted trade-offs.

The UI must remain sparse and should not expose the domain schema as forms.

Expected outcome: Principles begins accumulating user-owned learning rather than only answering questions.

## Phase 3 — Design + Execution

**Status:** Planned

Close the 5-Step Process:

```text
Problem
  -> Diagnosis
  -> Design
  -> Actions
  -> Outcome
  -> Reflection
```

Add only the task/project functionality required to execute machine changes. Avoid feature-count competition with generic project-management software.

Expected outcome: Principles can help turn insight into changed behavior, changed systems and measurable outcomes.

## Phase 4 — Learning Engine + Self Model

**Status:** Planned

Use longitudinal evidence to detect and test:

- recurring problems;
- repeated pain patterns;
- likely 5-Step failure points;
- conflicts between stated priorities and observed behavior;
- principle effectiveness;
- repeated machine-design failures;
- strengths, capabilities and weakness candidates.

The self-model must remain evidence-backed, correctable and non-deterministic.

Expected outcome: Principles creates compounding value from the user's own history.

## Phase 5 — Principles for Organizations

**Status:** Planned

Extend the proven kernel to the collective machine:

- Organization Workspace;
- people, roles, responsibilities and teams;
- culture signals;
- issues and disagreements;
- decision rights and governance;
- domain-specific believability;
- organization Goals, Problems, Designs, Outcomes, Reflections and Principles;
- permission-aware collective truth-seeking.

Expected outcome: a real team can use the same kernel to improve its machine without weakening privacy or reducing people to simplistic scores.

## Existing Reality Engine baseline

The existing Q&A stack remains useful throughout the phases:

```text
Private knowledge --> RAGFlow ------+
                                    |
Current public web -> Brave Search -+--> normalized evidence --> DeepSeek
```

It will evolve into the broader Reality Engine only after workspace permissions exist.

Potential later inputs include Activity Events, metrics, calendars, CRM, finance and operations systems.

## UI constraint across every phase

The system may become complex. The interface must not.

Core rule:

> Do not use small explanatory text to compensate for unclear structure or to fill empty space.

Prefer:

- stronger state;
- fewer visible items;
- direct actions;
- progressive disclosure;
- inspectable evidence on demand;
- empty space when nothing more deserves attention.

See `docs/product/UI_PRINCIPLES.md`.

## Explicitly retired directions

The following are not roadmap items:

- Thinker Machine modes;
- Council or simulated thinker agents;
- Brain / constellation / Principles Graph surfaces;
- Decision Brief / Decision Workspace as the product core;
- historical-thinker simulation;
- old V2 decision schema;
- generic CRM/HR/Finance modules before the kernel and required phase boundaries justify them.

Git history preserves those experiments. They are not current requirements.

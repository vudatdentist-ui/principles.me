# PROJECT CONTEXT — Principles

**Status:** Principles Kernel definition ready for review  
**Effective date:** 2026-08-23

This document is the source of truth for product and architecture context. If another document, issue, branch, old component, previous implementation, or prior chat conflicts with this file, this file wins until it is deliberately updated.

Detailed product definitions live in:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`

## 1. Product mission

Principles is an **evolution system for people and organizations**.

It should help a person or organization repeatedly:

```text
understand what they truly want
        ↓
see reality more accurately
        ↓
identify what prevents the desired reality
        ↓
diagnose root causes
        ↓
redesign the machine producing outcomes
        ↓
execute
        ↓
observe outcomes
        ↓
reflect on pain, surprise and error
        ↓
form or revise principles
        ↓
evolve
```

Principles for People is built first. Principles for Organizations later extends the same kernel from an individual machine to a collective machine of people and culture.

The product is not a decision-only application, thinker simulator, knowledge-graph visualization, multi-agent council, generic task manager, generic OKR product, or chatbot with management terminology added on top.

## 2. Philosophical core

The product is grounded in three central ideas from Ray Dalio's *Principles*:

### Dreams + Reality + Determination

- Dreams express the desired future.
- Reality is the best available understanding of what is actually true.
- Determination is the capacity to keep acting through the difficulty of changing reality.

Reality should improve the path to the dream, not automatically shrink the dream.

### The 5-Step Process

```text
Goal
  ↓
Identify Problems
  ↓
Diagnose Root Causes
  ↓
Design the Machine
  ↓
Push Through to Results
```

The product must preserve the difference between Problem, Diagnosis, Design and Execution rather than collapsing everything into tasks.

### Pain + Reflection = Progress

Pain, surprise, missed outcomes, repeated friction and mistakes are treated as learning signals.

The intended product loop is:

```text
experience
  → discrepancy
  → reflection
  → pattern
  → lesson
  → principle candidate
  → machine change
  → future evidence
```

Supporting mechanisms are also required: Radical Truth, Radical Open-Mindedness, looking at the machine from the higher level, and systemizing learning into revisable principles.

## 3. Principles Kernel

The conceptual kernel is:

```text
WHAT DO I WANT?
      |
      v
     GOAL
      |
      v
WHAT IS ACTUALLY TRUE?
      |
      v
   REALITY
      |
      v
     GAP
      |
      v
   PROBLEM
      |
      v
  DIAGNOSIS
      |
      v
    DESIGN
      |
      v
  EXECUTION
      |
      v
   OUTCOME
      |
      v
PAIN / SURPRISE / ERROR
      |
      v
 REFLECTION
      |
      v
  PRINCIPLE
      |
      v
UPDATE THE MACHINE
      |
      v
    EVOLVE
      |
      +---------------------> repeat
```

Current conceptual primitives include:

- Workspace
- Actor
- Goal
- Evidence
- Observation
- Belief
- Problem
- Diagnosis
- Machine
- Design
- Action
- Outcome
- Pain Signal
- Reflection
- Principle
- Activity Event

These primitives are **specified conceptually but are not yet implemented as durable domain schema**. Do not mechanically create one database table per noun without Phase 1 design work.

## 4. Goal definition

A Goal is **a chosen desired reality that matters enough to organize attention, trade-offs, diagnosis and action around it**.

A Goal is not simply:

```text
title + metric + target + deadline
```

Goal Discovery may need to establish:

- what the user truly wants;
- why it matters;
- whether the initial request is a goal, desire, proxy, or status symbol;
- which competing goal wins;
- accepted trade-offs;
- non-negotiable boundaries;
- qualitative success conditions;
- quantitative measures where useful.

Measures are Reality signals. They do not automatically define the meaning of the Goal.

## 5. Truth and Reality model

Principles must distinguish evidence from interpretation.

```text
SOURCE / EVENT
      |
      v
   EVIDENCE
      |
      v
 OBSERVATION
      |
      +-------------------+
      |                   |
      v                   v
   BELIEF             HYPOTHESIS
      |                   |
      +---------+---------+
                |
                v
            DIAGNOSIS
```

AI may infer or propose durable state, but AI output is not automatically truth.

Important AI suggestions should retain provenance, confidence and acceptance state so the system can answer:

> Why does Principles think this?

## 6. What exists in code today

The implemented product capability remains **hybrid knowledge Q&A**:

- the user asks a question;
- RAGFlow retrieves relevant private/internal knowledge;
- a live-search policy decides whether current public evidence is needed;
- Brave Search retrieves current public web results when configured and needed;
- private and live evidence are normalized into one inspectable evidence contract;
- DeepSeek receives the question plus normalized evidence and streams one answer;
- private evidence uses `[R#]` citations;
- live public evidence uses `[W#]` citations;
- citation guards prevent fabricated R/W keys;
- conflicts between internal knowledge and current public evidence must be surfaced.

Supporting technical assets that remain valid:

- RAGFlow bootstrap and document seeding;
- RAGFlow evidence provider;
- Brave live-search evidence provider;
- shared evidence contracts and retrieval policy;
- DeepSeek provider and stream parser;
- Docker/Traefik production delivery infrastructure.

This Q&A capability is now understood as the first part of the future **Reality Engine**, not the final product architecture.

## 7. Reality Engine direction

Current:

```text
Private knowledge --> RAGFlow ------+
                                    |
Current public web -> Brave Search -+--> Evidence --> DeepSeek
```

Future Reality inputs may include:

- direct user observations;
- Activity Events;
- metrics and outcomes;
- calendar;
- finance;
- CRM;
- operational systems;
- other structured connectors.

RAG and live search remain specialized evidence sources rather than becoming the system of record for all product state.

## 8. AI role

AI is an intelligence layer, not a visible council of agents and not the system of record.

The kernel defines five internal AI capabilities:

1. **Observe** — gather and bound evidence and observations.
2. **Challenge** — expose assumptions, conflicts, blind spots and missing evidence.
3. **Diagnose** — organize causes and root-cause hypotheses.
4. **Design** — propose changes to the machine and compare alternatives.
5. **Reflect** — learn from expected versus actual outcomes and propose principle changes.

AI must be allowed to say that evidence is insufficient.

## 9. Principles for People

The People product treats a person as both the operator and designer of their own machine.

The future self-model may learn evidence-backed patterns about:

- values and priorities;
- goals;
- strengths and capabilities;
- recurring weaknesses or constraints;
- repeated problems;
- behavior patterns;
- likely blind spots;
- which 5-Step stage repeatedly fails;
- principle effectiveness;
- outcomes.

The self-model is evolutionary and revisable. It must prefer traceable observations over fixed personality labels.

## 10. Principles for Organizations

Organizations are built only after the People kernel is proven.

The same loop extends to a collective machine of people and culture, with additional concepts such as:

- organization workspace;
- people;
- roles;
- responsibilities;
- teams;
- culture signals;
- issues and disagreements;
- decision rights;
- governance;
- relevant experience and track record;
- domain-specific believability.

Believability must not become a single global human score. It is contextual to a domain and based on relevant evidence.

Radical Transparency must not be implemented as "everyone sees everything." Truth-seeking must coexist with permissions, accountability and governance.

## 11. UI direction

The UI must remain minimal even as the kernel becomes structurally deep.

Core rule:

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

Additional constraints:

- critical meaning must not live in tiny helper copy;
- whitespace may remain empty;
- prefer state and action over explanatory paragraphs;
- default views show fewer items with stronger hierarchy;
- complexity is progressively disclosed;
- the user should not need to operate the internal ontology directly;
- AI should appear as system intelligence, not as fictional agent personalities;
- evidence and uncertainty remain inspectable on demand;
- do not fill dashboards with every metric merely because the data exists.

Primary screens should make these questions obvious without explanation:

1. What matters now?
2. What changed?
3. What needs attention?
4. What can I do next?

See `docs/product/UI_PRINCIPLES.md` for the full constraint set.

## 12. Security and platform boundary

Before durable personal or organization data is used in production:

- identity must exist;
- workspace scope must exist;
- authorization must happen before retrieval and AI access;
- `/api/ask` must operate in an authenticated workspace context;
- provider spending must be bounded by application-level usage/rate controls;
- browser evidence payloads must be safe projections rather than indiscriminate internal evidence objects;
- public search must never receive private RAG excerpts;
- cross-workspace access must be tested.

These are Phase 1 requirements.

## 13. Major phase plan

Principles will be built through large sequential phases. Only one major phase should be active at a time.

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Ready** | Product language, invariants, UI constraints and execution rules are explicit before schema work. |
| 1 | Secure Platform + Durable Kernel | Planned | A user can safely own durable personal state and the first kernel records have provenance. |
| 2 | Principles for People — First Complete Loop | Planned | One person can move from Goal Discovery → Reality → Problem → Reflection → Principle in a minimal UI. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces correctable patterns and improving principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports a collective machine, roles, disagreement, governance and domain-specific believability. |

Detailed scope and Definition of Done are in `docs/product/PHASE_PLAN.md`.

### Phase completion rule

A phase becomes **Complete** only when:

- its intended user loop works end-to-end;
- required privacy/security boundaries work;
- critical paths are automatically verified;
- actual outcome is compared with expected outcome;
- this file is updated with actual architecture, progress, limitations and the next active phase.

The roadmap itself is allowed to learn from reality.

## 14. Current progress

### Phase 0 — Kernel Definition

**Status:** Ready on `product/principles-kernel-v1`; not Complete until accepted and merged.

Produced:

- Principles Kernel Specification v1;
- UI Principles;
- Major Phase Plan;
- this updated project context;
- roadmap update.

**Expected outcome:** engineers and AI coding agents can build from one coherent product model without relying on legacy V2 concepts or prior conversation context.

### Next phase

After Phase 0 is accepted and merged, activate **Phase 1 — Secure Platform + Durable Kernel**.

Phase 1 must resolve identity, personal workspace semantics, Postgres/migrations, authorization, evidence projection, activity history, AI provenance and provider usage controls before a People loop is built on real private data.

## 15. What does NOT exist yet

Treat these as not implemented unless a later phase says otherwise:

- identity and authentication for the rebuilt product;
- personal workspace durable state;
- organization workspace, teams, roles, permissions and tenancy;
- durable Goal/Problem/Diagnosis/Design/Reflection/Principle domain records;
- Activity Event history;
- self-model and pattern learning;
- tasks/projects execution engine;
- CRM, finance, HR or operational domain modules;
- calendars, reminders, automations and structured business connectors;
- durable AI conversation memory;
- organization believability and governance.

## 16. Legacy concepts that are retired

Do not restore, reference as current architecture, or use as requirements without a new explicit decision:

- Thinker Machine;
- Council / Council agents;
- Brain / My Brain / Team Brain visual product model;
- historical-thinker personas;
- Principles Graph / constellation visualization;
- Decision Workspace / Decision Brief / DecisionRun product model;
- Review and decision-outcome loops from the previous V2 architecture;
- V2 route hierarchy and V2-specific contracts;
- the old landing/login prototype and fake product sections.

Git history is the archive.

## 17. Rules for AI coding agents and contributors

Before implementation:

- read this file;
- read the Kernel Specification and current active phase;
- do not start the next major phase before the current phase's Definition of Done;
- assume only hybrid RAG + live-search + AI Q&A exists in production code unless this context records a completed later phase;
- do not infer requirements from closed PRs or deleted V2 files;
- do not introduce `brain`, `council`, `thinker`, `decision workspace`, or `principles graph` architecture unless explicitly reintroduced;
- preserve fact/observation/belief/inference distinctions;
- preserve private/public evidence boundaries;
- do not reduce Goal to KPI CRUD;
- do not reduce Reflection to journaling;
- do not automatically promote AI-generated text to accepted truth;
- keep UI low-noise and avoid explanatory microcopy as filler;
- update this context at every major phase completion.

When uncertain whether legacy behavior should be preserved, default to **not preserving it** unless it belongs to the current knowledge/reality/AI baseline or active production infrastructure.

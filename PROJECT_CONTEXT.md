# PROJECT CONTEXT — Principles

**Status:** Phase 1 — Secure Platform + Durable Kernel — Ready for review  
**Effective date:** 2026-08-24  
**Active PR:** #54 (`phase/1-secure-platform-durable-kernel`)

This document is the source of truth for product and architecture context. If another document, issue, branch, old component, previous implementation, or prior chat conflicts with this file, this file wins until deliberately updated.

Detailed product definitions live in:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_1_OPERATIONS.md`

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

The product is grounded in three central ideas from Ray Dalio's *Principles*.

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

The product preserves the difference between Problem, Diagnosis, Design and Execution instead of collapsing everything into tasks.

### Pain + Reflection = Progress

Pain, surprise, missed outcomes, repeated friction and mistakes are learning signals:

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

Supporting mechanisms include Radical Truth, Radical Open-Mindedness, looking at the machine from the higher level, and systemizing learning into revisable principles.

## 3. Principles Kernel

The conceptual kernel is:

```text
WHAT DO I WANT?
      ↓
     GOAL
      ↓
WHAT IS ACTUALLY TRUE?
      ↓
   REALITY
      ↓
     GAP
      ↓
   PROBLEM
      ↓
  DIAGNOSIS
      ↓
    DESIGN
      ↓
  EXECUTION
      ↓
   OUTCOME
      ↓
PAIN / SURPRISE / ERROR
      ↓
 REFLECTION
      ↓
  PRINCIPLE
      ↓
UPDATE THE MACHINE
      ↓
    EVOLVE
      ↺
```

Conceptual primitives include Workspace, Actor, Goal, Evidence, Observation, Belief, Problem, Diagnosis, Machine, Design, Action, Outcome, Pain Signal, Reflection, Principle and Activity Event.

Phase 1 implements only the durable subset already justified for a secure substrate. Do not mechanically create one table per conceptual noun.

## 4. Goal definition

A Goal is **a chosen desired reality that matters enough to organize attention, trade-offs, diagnosis and action around it**.

A Goal is not simply `title + metric + target + deadline`. Goal Discovery belongs to Phase 2 and may establish what the user truly wants, why it matters, competing goals, trade-offs, non-negotiable boundaries and useful measures.

Measures are Reality signals. They do not automatically define the meaning of the Goal.

## 5. Truth and Reality model

Principles distinguishes evidence from interpretation:

```text
SOURCE / EVENT
      ↓
   EVIDENCE
      ↓
 OBSERVATION
      +-------------------+
      |                   |
      v                   v
   BELIEF             HYPOTHESIS
      |                   |
      +---------+---------+
                ↓
            DIAGNOSIS
```

AI may infer or propose durable state, but AI output is not automatically truth. Important AI suggestions retain provenance and acceptance state so the system can answer why it believes something.

## 6. What exists in code on Phase 1 PR #54

The branch now contains a **secure personal-platform substrate plus hybrid Reality Q&A**.

### Identity and Personal Workspace

- first-party email/password authentication;
- scrypt password hashing with random salt;
- opaque random session tokens, SHA-256 hashes persisted server-side;
- durable/revocable Postgres sessions;
- `HttpOnly`, `SameSite=Lax`, production-`Secure` session cookie;
- production bootstrap-only first-account creation with a server-owned setup key;
- one owned Personal Workspace per initial user;
- workspace membership foundation for later Organization workspaces;
- session resolution is pinned to the Personal Workspace the user owns.

### Durable system of record

PostgreSQL 16 now stores:

- User;
- Workspace and Membership;
- Session;
- workspace evidence-source binding;
- Goal foundation;
- Evidence record;
- Observation;
- Reflection foundation;
- Principle candidate foundation;
- AI Suggestion with acceptance state;
- Activity Event;
- rate-limit buckets.

Workspace-scoped composite foreign keys prevent cross-workspace provenance links between evidence and observations, principles or AI suggestions.

### Reality / Q&A

- RAGFlow retrieves relevant private/internal knowledge from dataset IDs bound to the authenticated workspace;
- an explicit empty workspace RAG scope never falls back to global dataset configuration;
- a live-search policy decides whether current public evidence is needed;
- Brave Search retrieves current public web evidence when configured and needed;
- private and live evidence are normalized for server-side synthesis;
- DeepSeek receives the question plus authorized normalized evidence and streams one answer;
- private evidence uses `[R#]` citations;
- live public evidence uses `[W#]` citations;
- citation guards prevent fabricated keys;
- conflicts between internal and current public evidence must be surfaced;
- the browser receives only a bounded safe evidence projection, never private RAG dataset/document/chunk IDs, full chunks or internal RAG URLs.

### Security and provider usage

`/api/ask` order is:

```text
trusted origin
  → authenticated session
  → owned Personal Workspace
  → durable workspace quota
  → workspace RAG bindings
  → retrieval
  → model
```

Authentication attempts use a durable hashed proxy-aware IP scope. Public live search receives only the user's public query, never private RAG text.

### Operations

- checksum-bound additive migrations;
- DB-aware health readiness;
- persistent PostgreSQL 16 on a private Docker network;
- pre-migration database snapshot with seven-snapshot retention;
- canary before release promotion;
- authentication-boundary production smoke;
- exact public release-SHA verification;
- application rollback preserves Postgres data;
- real PostgreSQL 16 integration verification under the unprivileged self-hosted runner;
- browser tests for account creation, sign-out/sign-in, unauthenticated AI rejection, safe evidence projection and normal document scrolling.

This is the Phase 1 substrate. It is **Ready on PR #54 but not Complete until accepted and merged**.

## 7. Reality Engine direction

Current:

```text
Private workspace knowledge -> RAGFlow ------+
                                            |
Current public web ----------> Brave Search -+--> Evidence --> DeepSeek
```

Future Reality inputs may include direct user observations, Activity Events, metrics and outcomes, calendar, finance, CRM, operational systems, and other structured connectors.

RAG and live search remain specialized evidence sources rather than the system of record for all product state.

## 8. AI role

AI is an intelligence layer, not a visible council of agents and not the system of record.

The kernel defines five internal AI capabilities:

1. **Observe** — gather and bound evidence and observations.
2. **Challenge** — expose assumptions, conflicts, blind spots and missing evidence.
3. **Diagnose** — organize causes and root-cause hypotheses.
4. **Design** — propose changes to the machine and compare alternatives.
5. **Reflect** — learn from expected versus actual outcomes and propose principle changes.

AI must be allowed to say evidence is insufficient. AI-generated durable suggestions remain pending until explicitly accepted/rejected/revised by product workflows.

## 9. Principles for People

The People product treats a person as both operator and designer of their own machine.

Phase 2 is the first complete People loop:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

Later longitudinal learning may model evidence-backed patterns about values, goals, strengths, recurring weaknesses/constraints, repeated problems, behavior patterns, blind spots, 5-Step failure points, principle effectiveness and outcomes. The self-model must remain revisable and prefer observations over fixed personality labels.

## 10. Principles for Organizations

Organizations are built only after the People kernel is proven.

The same loop extends to a collective machine with organization workspace, people, roles, responsibilities, teams, culture signals, issues/disagreements, decision rights, governance, relevant experience and domain-specific believability.

Believability is contextual and evidence-backed, never a single global human score. Radical Transparency does not mean everyone sees everything; truth-seeking must coexist with permissions and accountability.

## 11. UI direction

The UI remains minimal even as the kernel becomes structurally deep.

Core rule:

> **Do not use small explanatory text to compensate for unclear structure or to fill empty space.**

- critical meaning must not live in tiny helper copy;
- whitespace may remain empty;
- prefer state and action over explanatory paragraphs;
- default views show fewer items with stronger hierarchy;
- complexity is progressively disclosed;
- the user does not operate the internal ontology directly;
- AI appears as system intelligence, not fictional personas;
- evidence and uncertainty remain inspectable on demand.

Primary screens should make these questions obvious without explanation:

1. What matters now?
2. What changed?
3. What needs attention?
4. What can I do next?

See `docs/product/UI_PRINCIPLES.md`.

## 12. Security and platform boundary

The following are now established Phase 1 invariants:

- identity exists before private durable use;
- Personal Workspace ownership is explicit;
- authorization precedes retrieval and AI access;
- `/api/ask` runs in an authenticated workspace context;
- provider spending is bounded by durable application-level controls;
- browser evidence payloads are safe projections;
- public search never receives private RAG excerpts;
- cross-workspace access/provenance isolation is automatically tested;
- production DB is private, persistent and migrated before canary promotion.

Future phases must preserve these invariants rather than bypass them.

## 13. Major phase plan

Only one major phase should be active at a time.

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Product language, invariants, UI constraints and execution rules are explicit before schema work. |
| 1 | Secure Platform + Durable Kernel | **Ready** | A user can safely own durable personal state and the first kernel records have provenance. |
| 2 | Principles for People — First Complete Loop | Planned | One person can move from Goal Discovery → Reality → Problem → Reflection → Principle in a minimal UI. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces correctable patterns and improving principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports a collective machine, roles, disagreement, governance and domain-specific believability. |

Detailed scope and Definitions of Done are in `docs/product/PHASE_PLAN.md`.

A phase is Complete only after its intended outcome is merged/verified and this context records the actual result. Phase 1 is therefore Ready, not Complete, while PR #54 remains open.

## 14. Current progress

### Phase 0 — Kernel Definition

**Status:** Complete on `main`.

Produced the Principles Kernel Specification v1, UI Principles, Major Phase Plan, source-of-truth project context and phased roadmap.

### Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready for review on PR #54; not merged or deployed by this closeout.

Expected outcome was to let Principles safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

Actual outcome matches that substrate goal: identity, owned Personal Workspace, durable Postgres kernel foundations, workspace-scoped retrieval/quotas, evidence projection, provenance constraints, migration/backup/canary/rollback paths, and real-Postgres/browser verification now exist.

The implementation/audit/re-audit loop also corrected session ownership ambiguity, bootstrap secret-oracle behavior, malformed-cookie handling, proxy/rate-limit scope, cross-workspace provenance constraints, migration checksum drift, evidence leakage risk, stale DB environment assumptions, CI PostgreSQL privilege assumptions, and Next 16 request-time rendering boundaries.

### Next phase

After Phase 1 is accepted and merged, activate **Phase 2 — Principles for People: First Complete Loop**.

Do not begin Phase 2 durable product work on top of an unaccepted Phase 1 branch.

## 15. What does NOT exist yet

Treat these as not implemented unless a later phase says otherwise:

- password reset, email verification, OAuth/passkeys;
- organization workspace product, invites, teams, organization roles/permissions and workspace switching;
- Goal Discovery product flow;
- durable Problem/Diagnosis/Design product records and workflows;
- complete Reflection/Principle user flow despite Phase 1 substrate tables;
- self-model and longitudinal pattern learning;
- tasks/projects execution engine;
- CRM, finance, HR or operational domain modules;
- calendars, reminders, automations and structured business connectors;
- durable AI conversation history/memory;
- UI for changing RAGFlow workspace bindings;
- scheduled/off-host database backups and automated restore;
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
- read the Kernel Specification and the current phase contract;
- do not start the next major phase before the current phase is accepted/merged;
- assume the Phase 1 substrate described here exists only on PR #54 until it is merged to `main`;
- do not infer requirements from closed PRs or deleted V2 files;
- do not introduce `brain`, `council`, `thinker`, `decision workspace`, or `principles graph` architecture unless explicitly reintroduced;
- preserve fact/observation/belief/inference distinctions;
- preserve private/public evidence and workspace authorization boundaries;
- do not reduce Goal to KPI CRUD;
- do not reduce Reflection to journaling;
- do not automatically promote AI-generated text to accepted truth;
- keep UI low-noise and avoid explanatory microcopy as filler;
- preserve migration checksums and cross-workspace DB invariants;
- update this context at every major phase completion/readiness transition.

When uncertain whether legacy behavior should be preserved, default to **not preserving it** unless it belongs to the current Reality/AI baseline or active production infrastructure.

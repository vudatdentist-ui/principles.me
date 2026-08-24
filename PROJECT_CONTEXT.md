# PROJECT CONTEXT — Principles

**Status:** Phase 2 — Principles for People: First Complete Loop — **Ready (stacked)**  
**Effective date:** 2026-08-24  
**Phase 1 dependency:** PR #54 — `phase/1-secure-platform-durable-kernel` — Ready, unmerged  
**Active Phase 2 PR:** #55 — `phase/2-people-first-complete-loop` — stacked on Phase 1

This file is the source of truth for product and architecture context. If another document, issue, branch, old component, previous implementation, or prior chat conflicts with this file, this file wins until deliberately updated.

Read with:

- `docs/product/PRINCIPLES_KERNEL_SPEC_V1.md`
- `docs/product/UI_PRINCIPLES.md`
- `docs/product/PHASE_PLAN.md`
- `docs/product/PHASE_1_ARCHITECTURE.md`
- `docs/product/PHASE_1_OPERATIONS.md`
- `docs/product/PHASE_2_ARCHITECTURE.md`

## 1. Product mission

Principles is an **evolution system for people first and organizations second**.

It helps a person or organization repeatedly:

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

The product is not a decision-only app, thinker simulator, knowledge-graph visualization, multi-agent council, generic task manager, generic OKR product, or chatbot with management terminology added on top.

## 2. Principles Kernel

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

Conceptual primitives may include Workspace, Actor, Goal, Evidence, Observation, Belief, Problem, Diagnosis, Machine, Design, Action, Outcome, Pain Signal, Reflection, Principle and Activity Event. Do not mechanically create one table per conceptual noun; each phase adds only the durable state its user loop requires.

## 3. Core product invariants

### Goal

A Goal is **a chosen desired reality that matters enough to organize attention, trade-offs, diagnosis and action around it**. It is not `title + metric + target + deadline` and must not be reduced to KPI CRUD. Measures are optional Reality signals; they do not define the meaning of the Goal.

### Reality

Principles separates evidence from interpretation:

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

A direct user statement is evidence that the user reported or observed something. It is not automatically universal truth. AI output is never the system of record by itself.

### Problem

A Problem is a meaningful gap between the chosen Goal and accepted Reality. Problem, Diagnosis, Design and Execution remain distinct concepts.

### Reflection

Reflection is structured learning, not generic journaling. It asks what happened, what was expected, what surprised or hurt, whether it recurs, and what may be learned.

### Principle

A Principle is revisable. AI-generated candidates retain trigger, rule, rationale, evidence provenance, optional confidence and explicit acceptance state. They begin `pending` + `candidate`; accepting a candidate moves it only to `testing`, never directly to `trusted`.

## 4. What exists on the Phase 2 stack

Phase 2 inherits the verified Phase 1 substrate and adds the first complete People learning loop.

### Identity and Personal Workspace — Phase 1

- first-party email/password authentication;
- scrypt password hashing with random salt;
- opaque random session tokens with SHA-256 hashes persisted server-side;
- durable/revocable PostgreSQL sessions;
- `HttpOnly`, `SameSite=Lax`, production-`Secure` session cookie;
- bootstrap-only first production account with server-owned setup key;
- one owned Personal Workspace per initial user;
- workspace membership foundation;
- session resolution pinned to the owned Personal Workspace.

### Durable system of record — Phase 1 + Phase 2

PostgreSQL 16 stores the current justified durable subset:

- User, Workspace, Membership and Session;
- workspace evidence-source bindings;
- Goal plus Phase 2 discovery fields for trade-offs, boundaries, qualitative success conditions and optional measures;
- Evidence and accepted Observation;
- Goal-scoped Reality observations;
- durable Problems and Problem ↔ Evidence provenance;
- structured Reflections linked to both Goal and matching Problem;
- Principle candidates linked to Reflection and evidence;
- AI Suggestions with acceptance state and evidence provenance;
- Activity Events;
- durable rate-limit buckets.

Database constraints enforce workspace ownership of provenance links. Phase 2 additionally prevents a Reflection from pairing a Problem with a different Goal inside the same workspace, and prevents one AI suggestion from creating multiple durable Problem or Principle records.

### Phase 2 People loop

A signed-in user can now complete:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

The root authenticated experience is the People loop. Knowledge Q&A is a secondary authenticated surface at `/knowledge`.

Goal Discovery asks one unresolved question at a time and has a deterministic fallback when AI is unavailable. Reality writes direct-user Evidence + accepted Observation atomically. Problem AI output remains a proposal until confirmed or edited by the user. Reflection is progressive rather than a large form. Principle candidates can be accepted, rejected or revised; accepted candidates enter `testing` only.

### Reality / Knowledge engine — Phase 1

- RAGFlow retrieves private/internal knowledge from dataset IDs bound to the authenticated workspace;
- an explicit empty workspace RAG scope never falls back to global dataset configuration;
- Brave Search may retrieve current public evidence when configured and needed;
- DeepSeek synthesizes authorized normalized evidence;
- private evidence uses `[R#]`; public live evidence uses `[W#]`;
- citation guards prevent fabricated keys;
- private browser payloads exclude RAG dataset/document/chunk IDs, full chunks and internal RAG URLs.

### Security and provider usage

Private product state and AI calls follow this boundary:

```text
trusted origin for mutation
  → authenticated session
  → owned Personal Workspace
  → durable workspace quota before provider work
  → server-side workspace-scoped context
  → validated model output
  → explicit user-controlled durable mutation
```

Public live search receives only the public query, never private RAG excerpts. Browser state is a safe projection that strips internal workspace/evidence identifiers not required for interaction.

### Operations

- checksum-bound additive migrations 0001 + 0002;
- DB-aware health readiness;
- persistent PostgreSQL 16 on a private Docker network;
- pre-migration database snapshots with retention;
- canary before release promotion;
- authentication-boundary production smoke;
- exact public release-SHA verification;
- application rollback preserves PostgreSQL data;
- real PostgreSQL 16 verification on the unprivileged self-hosted runner;
- deterministic mocked DeepSeek browser verification.

## 5. Phase 2 user experience

The primary surface makes the current stage legible:

```text
Goal → Reality → Problem → Reflect → Principle
```

UI rules remain:

- one primary active step at a time;
- completed durable state is compact;
- evidence and details use progressive disclosure;
- Knowledge Q&A is secondary, not the product identity;
- no dashboard filler or speculative navigation shell;
- normal document scrolling remains intact;
- do not use tiny explanatory text to compensate for unclear structure.

## 6. AI role

AI is an intelligence layer, not a visible council of agents and not the source of truth.

The kernel defines five internal capability families: Observe, Challenge, Diagnose, Design and Reflect. Phase 2 uses a deliberately narrower subset: Goal Discovery questioning, Problem proposal and Principle proposal.

AI must be able to fail or say evidence is insufficient. Generated durable suggestions remain user-controlled. No provider path may directly create a trusted Principle.

## 7. Principles for People

The People product treats a person as both operator and designer of their own machine.

Phase 2 proves one coherent unit of user-owned learning can accumulate:

```text
chosen desired reality
  + observed reality
  + recognized gap
  + reflection
  + revisable principle candidate
```

Longitudinal pattern learning, self-modeling, Diagnosis, Design, Action and Outcome remain later work.

## 8. Principles for Organizations

Organizations are built only after the People kernel is proven further. Future organization work may add Organization Workspace, people, roles, responsibilities, teams, culture signals, issues/disagreements, decision rights, governance, relevant experience and domain-specific believability.

Believability must be contextual and evidence-backed, never a global human score. Radical Transparency does not mean everyone sees everything; truth-seeking must coexist with permissions and accountability.

## 9. Phase status

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language and invariants are explicit. |
| 1 | Secure Platform + Durable Kernel | **Ready — PR #54, unmerged** | A user can safely own durable personal state with provenance. |
| 2 | Principles for People — First Complete Loop | **Ready (stacked) — PR #55** | One person can move Goal → Reality → Problem → Reflection → Principle in a minimal interface. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Longitudinal evidence produces correctable patterns and improving principles. |
| 5 | Principles for Organizations | Planned | The proven kernel supports a collective machine under explicit permissions. |

A phase is **Complete** only after acceptance, merge, target-branch verification and context update. Therefore Phase 1 and Phase 2 are both Ready, not Complete.

## 10. Phase 2 audit result

The required execution loop was followed:

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

Audit/re-audit corrected issues beyond the initial happy path, including:

- unsafe composite-FK delete semantics that could undermine tenant ownership;
- unnecessary internal evidence UUID exposure to the browser;
- AI suggestion replay into multiple durable Problem/Principle rows;
- Reality not being scoped tightly enough to its Goal;
- optional measures accidentally behaving like required KPI fields;
- transaction typing against the wrong `postgres` overload;
- broad E2E locators that tested incidental copy instead of state transitions;
- Goal/Reality semantic mismatch around Problem proposals;
- non-atomic Principle suggestion + candidate persistence;
- integration assertions coupled to driver-specific error codes rather than durable behavior;
- integration files racing through shared `TRUNCATE`, fixed by serial real-DB execution;
- Reflections able to pair a same-workspace Problem with the wrong Goal at the DB layer;
- insufficient durable coverage for Principle reject/revise and prevention of automatic `trusted` promotion.

The code-closeout head `710bfef93259008308075cad1e2a043b3cd94ce0` passed Foundation #126, Lint #461 and Playwright #228. Documentation closeout must also pass those gates before PR #55 is marked Ready for review.

## 11. What does not exist yet

Treat these as unimplemented unless a later phase deliberately adds them:

- password reset, email verification, OAuth/passkeys;
- Organization Workspace product, invites, teams, organization roles/permissions and workspace switching;
- durable Diagnosis, Design, Action and Outcome product workflows;
- longitudinal self-model and pattern-learning engine;
- task/project execution engine beyond what a future Design + Execution phase justifies;
- CRM, finance, HR or other generic business-domain modules;
- calendars, reminders, automations and structured business connectors;
- durable AI conversation history/memory;
- UI for changing RAGFlow workspace bindings;
- scheduled/off-host database backups and automated restore;
- organization believability/governance product.

Do not infer these features from deleted code or future phase language.

## 12. Legacy concepts that remain retired

Do not restore or use as requirements without a new explicit product decision:

- Thinker Machine;
- Council / Council agents;
- Brain / My Brain / Team Brain visual model;
- historical-thinker personas;
- Principles Graph / constellation visualization;
- Decision Workspace / Decision Brief / DecisionRun product model;
- previous V2 Review/decision-outcome loops;
- V2 route hierarchy/contracts;
- the old landing/login prototype and fake product sections.

Git history is the archive.

## 13. Stacked-phase governance

The normal rule remains: do not activate a new major phase casually before the current one is accepted.

A deliberate exception is allowed for **stacked development** when all of these are true:

1. the predecessor phase is already `Ready` with green verification;
2. the user explicitly asks to begin the next phase;
3. the next branch is based on the predecessor's verified head;
4. CI runs against the stacked PR;
5. merge/deploy order remains strict — the dependent phase cannot enter `main` or production before its predecessor dependency is resolved.

Phase 2 uses this exception. It is stacked on Phase 1 and must not be retargeted/merged/deployed ahead of Phase 1. Phase 3 has **not** started.

## 14. Rules for AI coding agents and contributors

Before implementation:

- read this file, the Kernel spec, UI principles and current phase contract;
- on the Phase 2 branch, assume the verified Phase 1 substrate plus the Phase 2 People loop described here exist;
- on `main`, do not assume unmerged PR state exists;
- do not auto-start Phase 3;
- do not infer requirements from closed PRs or deleted V2 files;
- preserve Evidence/Observation/Belief/Inference distinctions;
- preserve private/public evidence and workspace authorization boundaries;
- do not reduce Goal to KPI CRUD;
- do not reduce Reflection to journaling;
- do not automatically promote AI text to accepted or trusted truth;
- keep UI low-noise and avoid explanatory microcopy as filler;
- preserve migration checksums and cross-workspace/semantic DB invariants;
- run real PostgreSQL integration tests serially while they share a destructive test database;
- update this context at every major readiness/completion transition.

When uncertain whether legacy behavior should be preserved, default to **not preserving it** unless it belongs to the current verified substrate or explicitly accepted product behavior.

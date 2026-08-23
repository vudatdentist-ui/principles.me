# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-24  
**Rule:** only one major phase is active at a time.

This plan translates the Principles Kernel into a sequence of large product phases. Each phase must reach its intended behavioral outcome before the next phase becomes active.

A phase is not complete because code exists. A phase is complete only when:

1. the intended user loop/outcome works;
2. security and data boundaries required by that phase are enforced;
3. automated verification covers the critical path;
4. expected outcome is evaluated against the actual implementation/use;
5. `PROJECT_CONTEXT.md` is updated with actual progress and outcome;
6. unresolved compromises are recorded rather than hidden;
7. the phase is accepted, merged and verified on the target branch.

## Progress states

- **Planned** — defined but not started.
- **Active** — current major implementation focus.
- **Ready** — implementation/spec work is complete on a branch/PR and awaiting acceptance/merge.
- **Complete** — merged, verified, and the phase outcome has been recorded in product context.
- **Blocked** — cannot responsibly continue until a named dependency or decision is resolved.

## Program view

| Phase | Name | Status | Expected outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, invariants, UI constraints and phase rules are explicit before schema work. |
| 1 | Secure Platform + Durable Kernel | **Ready** | A user can safely own durable personal state and the system can store the first kernel primitives with provenance. |
| 2 | Principles for People — First Complete Loop | Planned | One person can move from meaningful Goal → Reality → Problem → Reflection → Principle in a minimal interface. |
| 3 | Design + Execution | Planned | Diagnosed problems can change the personal machine through designs, actions, outcomes and review. |
| 4 | Learning Engine + Self Model | Planned | Principles can identify recurring patterns and improve suggestions from longitudinal evidence without turning inference into fixed truth. |
| 5 | Principles for Organizations | Planned | The same kernel supports collective goals, people/culture machine design, disagreement, roles, permissions and domain-specific believability. |

---

# Phase 0 — Kernel Definition

**Status:** Complete  
**Merged baseline:** `main`

## Objective

Prevent Principles from becoming conventional productivity software with Ray Dalio terminology layered on top.

## Delivered

- Principles Kernel specification.
- Goal defined as a chosen desired reality rather than KPI CRUD.
- Reality/evidence distinction.
- Problem, Diagnosis, Design, Outcome, Reflection and Principle definitions.
- Machine concept for People and future Organizations.
- AI roles: Observe, Challenge, Diagnose, Design, Reflect.
- People-first / Organizations-later thesis.
- minimal UI principles and no-filler-microcopy constraint.
- sequential major-phase governance.

## Outcome

Engineers and AI coding agents can identify what Principles is building, what the core nouns mean, what the UI should hide by default, and which phase can responsibly be implemented without relying on deleted V2 history.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready  
**Implementation branch:** `phase/1-secure-platform-durable-kernel`  
**Pull request:** #54

## Objective

Create the smallest secure platform on which personal Principles state can exist safely and durably.

The goal is not to implement the whole People product. It is to establish ownership, identity, authorization, provenance, event history, provider-cost boundaries, and the first durable kernel slices without speculative abstractions.

## Implemented decisions

- first-party email/password authentication;
- scrypt password storage and opaque hashed sessions;
- bootstrap-only first production account;
- one owned Personal Workspace per user;
- PostgreSQL 16 as durable system of record;
- additive checksum-bound migrations;
- workspace as private retrieval and provider-quota boundary;
- strict server/client evidence projection;
- Postgres-backed `/api/ask` and auth usage limits;
- private persistent production Postgres network/volume;
- pre-migration snapshots, canary and rollback-safe application promotion.

## Durable capabilities

- User identity.
- Personal Workspace and membership foundation.
- Session.
- Workspace evidence-source binding.
- Goal foundation.
- Evidence record and Observation foundation.
- Reflection foundation.
- Principle candidate foundation.
- AI Suggestion with explicit acceptance state and evidence provenance.
- append-oriented Activity Event.
- durable rate-limit bucket.

Database-level composite foreign keys prevent evidence provenance from crossing workspace boundaries.

## Security requirements — achieved

- `/api/ask` authenticates before private retrieval/model access;
- workspace quota is consumed before provider calls;
- RAG dataset binding is resolved from the authenticated workspace;
- an explicit empty RAG scope does not fall back to global datasets;
- browser evidence payloads exclude private IDs/full chunks/internal RAG URLs;
- public live search receives only the user's public query;
- authentication throttling uses a hashed proxy-aware IP scope;
- cross-workspace state/provenance and Personal Workspace session ownership are automatically tested.

## UI scope — achieved

Minimal identity/workspace state and the existing Q&A surface only. No settings-heavy shell or speculative Phase 2 navigation was added.

## Definition of Done — achieved on PR #54

- user can create/sign in/sign out and owns a Personal Workspace;
- durable kernel state is isolated by workspace;
- `/api/ask` operates inside an authenticated workspace boundary;
- client citation projection is bounded and safe;
- provider usage is bounded by durable application-level controls;
- migrations, health, real-Postgres tests, production canary and rollback paths are defined and verified;
- `PROJECT_CONTEXT.md` records actual architecture, trade-offs and limitations.

## Re-audit result

The required loop was executed:

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

Re-audit found and corrected issues in CI PostgreSQL privilege assumptions, shared-library ABI loading, Next 16 request-time rendering, malformed session cookies, Personal Workspace ownership selection, proxy/rate-limit scope, evidence leakage, cross-workspace provenance, migration checksums, production DB environment assumptions, pre-migration backup safety, bootstrap secret-oracle behavior, JSON persistence typing and browser sign-in coverage.

## Expected versus actual outcome

**Expected:** Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

**Actual:** the secure substrate is present and verified on PR #54. The first complete Goal → Reality → Problem → Reflection → Principle product loop is still absent by design and belongs to Phase 2.

Phase 1 remains **Ready**, not Complete, until accepted and merged.

## Explicit limitations carried forward

- no password reset/email verification/OAuth/passkeys;
- no organization workspace product, invites or switching;
- no user-facing Goal Discovery/Problem/Diagnosis/Design/Reflection/Principle loop;
- no durable conversation history or self-model;
- no RAG-binding administration UI;
- no scheduled/off-host DB backup or automated restore process;
- no generic project/task or business-domain products.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Planned — activate only after Phase 1 is accepted and merged

## Objective

Ship the smallest experience that proves Principles is an evolution system rather than a chatbot or goal tracker.

```text
Goal Discovery
    → Reality
    → Problem
    → Reflection
    → Principle Candidate
```

Diagnosis/execution may appear lightly where necessary, but deep Design/Action workflow belongs to Phase 3.

## Goal Discovery

The experience must distinguish Goal from desire, desired reality from proxy metric, why the Goal matters, competing Goals, accepted trade-offs, non-negotiable boundaries, and useful success measures. The user should not be forced through a long form; AI asks only the highest-value unresolved question.

## Reality

Initial inputs may include user statements, private workspace RAG, Brave live search when current public context matters, and Activity Events created inside Principles. Structured business connectors are not required yet.

## Reflection

Reflection should progressively support:

```text
What happened?
What did you expect?
What surprised or hurt?
Is this recurring?
What might this teach us?
```

It must not become a generic journal form.

## Principle candidate

A candidate retains trigger/situation, proposed rule, rationale, evidence links, confidence/trust lifecycle and user acceptance state. AI-generated principles never become trusted truth automatically.

## Definition of Done

At least one realistic People scenario can complete the loop without database editing or developer intervention. The user can discover a meaningful Goal, inspect evidence behind Reality, recognize a Problem relative to that Goal, reflect briefly, accept/reject/revise a Principle candidate, and understand the primary UI without helper paragraphs or tiny instructional copy.

## Expected outcome

Principles begins accumulating high-quality, user-owned learning rather than only answering questions.

---

# Phase 3 — Design + Execution

**Status:** Planned

## Objective

Close the 5-Step loop from diagnosed Problem to changed machine and observed Outcome.

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

Diagnosis preserves symptom/root-cause distinctions, alternatives, uncertainty and evidence. Design represents machine change rather than a checklist. Execution adds only task/project primitives required to execute those designs reliably.

A sparse Today surface becomes valuable here and should show only a small number of items requiring attention.

## Definition of Done

A user can take a diagnosed repeated problem, design a machine change, execute it, and compare actual results with expected outcomes.

## Expected outcome

Principles helps create behavior and machine change, not just insight.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Planned

## Objective

Use longitudinal evidence to make Principles meaningfully more useful over time.

Capabilities may include repeated-problem/pain detection, 5-Step failure-pattern analysis, stated-priority versus observed-behavior tensions, principle effectiveness, recurring diagnosis/design patterns, and evolving strength/weakness candidates.

The self-model describes observations and patterns before reducing people to traits. Every meaningful pattern needs a correction path, and corrections become evidence about the model itself.

## Definition of Done

Principles can surface at least one useful longitudinal pattern that the user can trace to cases, correct if wrong, and use to change future behavior or a principle.

## Expected outcome

The product develops compounding value from the user's own experience rather than resetting to a stateless AI conversation.

---

# Phase 5 — Principles for Organizations

**Status:** Planned

## Objective

Extend the proven People kernel to a collective machine without weakening privacy, governance or truth-seeking.

New dimensions include Organization Workspace, people, roles, responsibilities, teams, culture signals, issues/disagreements, decision rights, governance and domain-specific believability.

Believability is domain-specific and evidence-backed, never a global human-worth score. Radical Transparency rejects both “everyone sees everything” and “hierarchy decides truth.”

## Definition of Done

A small real team can share a Goal, surface a meaningful Problem/disagreement, inspect evidence under correct permissions, diagnose a machine problem, assign a design/owner, observe an outcome, reflect and update an organizational Principle without exposing private data outside authorization boundaries.

## Expected outcome

Principles becomes a collective evolution system built on the same kernel proven for individuals.

---

# Phase transition protocol

At the end of every phase:

1. run technical verification and critical-path product tests;
2. record what was actually built;
3. record what was intentionally deferred;
4. compare actual result with expected outcome;
5. update `PROJECT_CONTEXT.md` with actual architecture, progress, achieved outcome, limitations and next phase;
6. update this plan and `ROADMAP.md`;
7. obtain acceptance/merge;
8. only then activate the next major phase.

This protocol is mandatory because the product model is expected to learn from reality as implementation proceeds.

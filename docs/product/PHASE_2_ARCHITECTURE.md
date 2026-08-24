# Phase 2 — Principles for People: First Complete Loop

**Status:** **Ready (stacked)**  
**Started:** 2026-08-24  
**Readiness closeout:** 2026-08-24  
**Branch:** `phase/2-people-first-complete-loop`  
**Pull request:** #55  
**Base dependency:** Phase 1 PR #54 head `3322d4a128204874d9bb65749bd60cdd48175bfe`

This document is the implementation, acceptance and audit contract for Phase 2.

Phase 2 was deliberately implemented as stacked work because Phase 1 was already Ready with green verification and the user explicitly asked to proceed. Phase 2 may be reviewed on top of that substrate, but it must not enter `main` or production before the Phase 1 dependency is resolved.

## 1. Objective

Prove that Principles is an evolution system rather than only an authenticated knowledge assistant.

The smallest complete People loop is:

```text
Goal Discovery
  → Reality
  → Problem
  → Reflection
  → Principle Candidate
```

A realistic user can complete this loop without database editing or developer intervention and recover the durable state after reload.

Deep Diagnosis, Design, Actions and Outcomes remain Phase 3.

## 2. Product invariants

### Goal

A Goal is a chosen desired reality, not a KPI row.

Goal Discovery clarifies:

- desired reality;
- why it matters;
- accepted trade-offs;
- non-negotiable boundaries;
- qualitative success conditions;
- useful measures when they genuinely help.

Measures are optional. The experience asks one focused unresolved question at a time instead of exposing a large form.

### Reality

Reality preserves the distinction between evidence and interpretation.

The Phase 2 minimum path stores a direct user observation atomically as durable Evidence + accepted Observation tied to the selected Goal. The statement is evidence that the user reported or observed something; it is not automatically universal truth.

Private RAG and current public search remain separate evidence-gathering capabilities under authenticated Knowledge Q&A.

### Problem

A Problem is a meaningful gap between the chosen Goal and accepted Reality.

A durable Problem:

- belongs to one workspace;
- links to one Goal;
- retains a concise statement and optional gap text;
- retains selected Evidence provenance;
- cannot be created from another workspace's Goal/Evidence;
- cannot reuse one AI suggestion to create multiple Problem rows.

AI Problem output remains a proposal until the user confirms or edits it.

### Reflection

Reflection is a structured learning act, not generic journaling.

The UI progressively captures:

```text
What happened?
What did you expect?
What surprised or hurt?
Is this recurring?
What might this teach you?
```

A completed Reflection is linked to both Goal and Problem. The database enforces that the linked Problem belongs to that same Goal, not merely the same workspace.

### Principle candidate

A Principle candidate retains:

- trigger/situation;
- proposed rule;
- rationale;
- Evidence links where available;
- optional confidence;
- Reflection origin;
- explicit acceptance state.

AI-generated candidates begin `pending` + `candidate`. They never become trusted truth automatically.

The user may:

- accept → `accepted` + `testing`;
- reject → retain the row as rejected;
- revise → persist edited trigger/rule/rationale and revised lifecycle.

## 3. AI and security boundary

AI is an intelligence layer, not the system of record.

Phase 2 AI may:

- ask the next Goal Discovery question;
- propose a concise Problem from Goal + selected Reality;
- propose one conditional Principle candidate from a completed Reflection.

Every AI mutation endpoint:

1. checks trusted same-origin mutation context;
2. resolves authenticated session and owned Personal Workspace;
3. consumes a durable workspace quota before provider work;
4. loads private context server-side with workspace scope;
5. validates structured model output;
6. keeps internal workspace/evidence identifiers out of browser payloads unless explicitly required by the safe client contract;
7. leaves durable acceptance/revision/rejection under user control.

Goal Discovery has a deterministic fallback and skips provider work once required discovery fields are complete.

## 4. Durable Phase 2 slice

Phase 2 extends the Phase 1 kernel only where the loop requires it.

Migration 0002 adds:

- Goal fields for accepted trade-offs, boundaries, qualitative success conditions and optional measures;
- `observations.goal_id` with tenant-safe Goal linkage;
- durable `problems` and `problem_evidence`;
- Reflection ↔ Problem linkage plus recurrence fields;
- Principle ↔ Reflection and AI Suggestion origin linkage;
- replay-prevention indexes for AI-sourced Problems and Principles;
- composite Problem identity sufficient to enforce Reflection `(problem, workspace, goal)` consistency.

No Diagnosis, Design, Action, Outcome, project-management, self-model or organization product tables were added.

## 5. Primary UI

The authenticated root is the People loop:

```text
Goal → Reality → Problem → Reflect → Principle
```

Rules achieved:

- one primary active step at a time;
- completed durable state shown compactly;
- evidence/details progressively disclosed;
- Knowledge Q&A retained as a secondary authenticated surface at `/knowledge`;
- no dashboard filler or speculative settings shell;
- normal document scrolling preserved.

## 6. Acceptance criteria — achieved

### End-to-end People loop

Browser verification proves a new authenticated user can:

1. discover and commit a meaningful Goal;
2. add one Goal-scoped Reality observation;
3. recognize and confirm a Problem relative to that Goal;
4. complete progressive Reflection;
5. receive a Principle candidate;
6. explicitly accept it into testing;
7. reload and still see the durable loop state.

The user-facing UI also exposes reject and revise paths; real-Postgres integration tests verify their durable semantics.

### Goal Discovery

- one focused question at a time;
- deterministic fallback if AI is unavailable;
- provider call skipped after required fields are complete;
- measures optional;
- Goal commit persists desired reality, why, trade-offs, boundaries, success conditions and optional measures;
- Goal data workspace-scoped.

### Reality and Evidence

- Reality writes Evidence + accepted Observation atomically;
- Observation links to its Goal and Evidence under tenant-safe constraints;
- client projection excludes internal evidence/workspace IDs;
- cross-workspace Reality attempts reject without leaving orphan Evidence.

### Problem

- Problem explicitly links to Goal;
- selected Evidence provenance retained;
- AI Problem proposal remains pending until user confirmation/edit;
- proposal confirmation validates Goal/Reality context;
- cross-workspace Goal/Evidence links reject;
- one AI suggestion cannot create multiple Problems.

### Reflection

- Reflection links to Goal and Problem;
- database rejects same-workspace Goal/Problem mismatches;
- happened, expected, surprise, recurrence and learning are durable;
- cross-workspace links reject.

### Principle candidate

- AI proposal, provenance, Principle and Activity Event persist atomically;
- invalid Reflection origin rolls the transaction back without orphan AI Suggestion/Principle rows;
- candidate retains Reflection origin and Evidence provenance;
- accept → testing only;
- reject retains rejected record;
- revise persists edited content;
- one AI suggestion cannot create multiple Principles;
- integration audit confirms zero automatically created `trusted` Principles.

### Security and provider cost

- Phase 2 APIs require authentication;
- mutation requests use the trusted-origin guard;
- AI endpoints consume durable workspace quota before provider work;
- private rows are always workspace-scoped;
- safe browser projection strips unnecessary internal identifiers;
- automated tests cover tenant isolation and semantic Goal consistency.

### Operations

- migration 0002 is additive and checksum-tracked;
- Phase 1 application rollback remains compatible with the additive schema;
- no new runtime service/topology is required;
- CI applies migration 0001 + 0002 against PostgreSQL 16;
- integration files sharing one destructive test database execute serially with `--test-concurrency=1` to prevent cross-test `TRUNCATE` races.

## 7. Audit → fix → re-audit findings

The implementation changed materially because of audit findings. Key corrections:

1. **Composite FK delete semantics** — avoided `SET NULL` behavior that could attempt to null a required tenant key.
2. **Minimal browser projection** — removed unnecessary internal Evidence UUIDs from People client state.
3. **AI replay protection** — added unique partial indexes so one suggestion cannot mint multiple Problems or Principles.
4. **Goal-scoped Reality** — tied accepted Observation to its Goal instead of relying on workspace-latest state.
5. **Goal ≠ KPI form** — made measures optional and removed them from readiness requirements.
6. **Correct transaction contract** — used public `postgres.TransactionSql` rather than inferring the wrong overload.
7. **Behavior-oriented E2E** — replaced broad text locators with state-transition checks.
8. **Problem context integrity** — proposal confirmation validates the same Goal + Reality + Evidence context.
9. **Atomic Principle persistence** — AI Suggestion, provenance, candidate and Activity Event now share one transaction.
10. **Invariant-focused integration tests** — tests assert rejection + unchanged durable row counts instead of depending on driver-specific PostgreSQL error surfaces.
11. **Test isolation** — serialized destructive real-DB integration files after audit found concurrent global `TRUNCATE` races.
12. **Reflection semantic FK** — database now rejects a Reflection whose Problem belongs to a different Goal in the same workspace.
13. **Principle lifecycle coverage** — real-Postgres tests cover accept, reject, revise, replay protection and absence of automatic trusted promotion.

## 8. Verification

Implementation code-closeout head:

`710bfef93259008308075cad1e2a043b3cd94ce0`

It passed:

- Foundation #126 ✅ — PostgreSQL 16, migrations 0001 + 0002, typecheck, unit tests, serial real-Postgres integration tests, production build;
- Lint #461 ✅ — Biome and configured shell/CI validation;
- Playwright #228 ✅ — authenticated boundary, full People loop + reload, safe Knowledge projection, normal document scrolling.

This documentation closeout intentionally creates a later branch head. PR #55 must pass Foundation, Lint and Playwright again on that final documentation head before it is marked Ready for review. The exact final head/run numbers belong in the PR closeout so verification does not become self-invalidating by another documentation commit.

## 9. Expected versus actual outcome

**Expected:** Principles begins accumulating high-quality, user-owned learning rather than only answering questions.

**Actual:** a person can persist one coherent unit of learning:

```text
chosen desired reality
  + observed reality
  + recognized gap
  + structured reflection
  + revisable principle candidate
```

The state survives reload, remains workspace-scoped, retains provenance, and keeps AI advisory rather than authoritative.

## 10. Explicitly deferred

Phase 2 does not implement:

- deep Diagnosis/root-cause workflow;
- Design/Machine-change workflow;
- Actions/tasks/projects;
- Outcomes and outcome review;
- longitudinal self-model/pattern learning;
- organization workspaces/teams/governance;
- generic CRM, finance, HR or domain modules;
- durable conversation memory;
- structured business connectors.

These remain later-phase decisions rather than hidden Phase 2 scope.

## 11. Readiness and dependency

Phase 2 is **Ready (stacked)** after the required loop:

```text
Understand requirements
  → define acceptance criteria
  → implement
  → audit
  → fix
  → re-audit
  → final output check
  → report result
```

It is not Complete. PR #55 remains dependent on unmerged Phase 1 PR #54, and neither Phase 2 nor its production behavior may be merged/deployed ahead of that dependency. Phase 3 has not started.

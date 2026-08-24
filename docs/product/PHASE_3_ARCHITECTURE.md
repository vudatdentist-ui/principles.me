# Phase 3 — Design + Execution

**Status:** **Ready**  
**Started:** 2026-08-24  
**Readiness closeout:** 2026-08-24  
**Branch:** `phase/3-design-execution`  
**Pull request:** #57  
**Base:** Phase 0–2 Complete on `main`

This document is the implementation, acceptance and audit contract for Phase 3.

Phase 3 continues the 5-Step Process from a recognized Problem into an observed machine change:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

The objective is not project-management breadth. It is to prove that Principles can turn a recognized gap into a reasoned machine change, execute only the commitments needed to test that change, observe what actually happened, and learn from the difference between expectation and Reality.

## 1. Product invariants — achieved

### Diagnosis is not a solution

Diagnosis is a user-reviewed cause-and-effect hypothesis. It preserves:

- visible symptom;
- proximate cause;
- root-cause hypothesis;
- supporting evidence;
- contradicting evidence;
- plausible alternatives;
- uncertainty;
- optional confidence.

The Diagnosis AI prompt explicitly forbids remedy/task proposals and tells the model to admit insufficient evidence rather than manufacture certainty. AI output remains pending until user confirmation or revision.

### Design changes the machine

Design represents a proposed change to the system producing the outcome. It retains:

- machine change;
- cause-and-effect rationale;
- expected result;
- success signal;
- 1–5 minimal Actions needed to execute the change.

Actions are subordinate to Design. No generic Projects, kanban, sprint, assignment or task-management shell was introduced.

### Outcome is Reality, not task completion

Action completion never marks a Design successful. A Design stays `active` until a valid Outcome is recorded.

Outcome atomically stores:

- expected-result snapshot;
- actual result;
- user comparison: `improved`, `mixed`, `worse`, or `unclear`;
- direct-user Evidence;
- accepted Goal-scoped Observation.

After evaluation, the Design becomes `evaluated` and its Actions become immutable. Phase 3 v1 permits one Outcome per Design.

### Review closes the loop

A post-Outcome Review asks only:

```text
What surprised you about the result?
What did this result teach you?
```

The resulting completed Reflection retains expected versus actual context and is linked to the matching Outcome, Goal and Problem.

## 2. Durable implementation

Migration `0003_design_execution.sql` adds only the schema required by the loop:

- `diagnoses`;
- `diagnosis_evidence`;
- `designs`;
- `execution_actions`;
- `outcomes`;
- `outcome_reflections`;
- composite tenant/semantic keys;
- AI-suggestion replay constraints;
- one Outcome per Design;
- database trigger preventing Action mutation after Design evaluation.

Database constraints enforce the same Workspace + Goal + Problem + Diagnosis + Design chain rather than relying only on API checks.

## 3. AI and security boundary — achieved

Phase 3 AI may:

- propose Diagnosis from Goal + Problem + selected Evidence + Reflection;
- propose one machine Design from an accepted Diagnosis;
- propose 1–5 minimal execution Actions.

It may not persist accepted Diagnosis/Design state, invent supporting evidence, mark work complete, judge the Outcome for the user, or promote Principles to trusted.

Every Phase 3 AI mutation preserves the existing boundary:

1. trusted same-origin mutation;
2. authenticated owned Personal Workspace;
3. durable workspace AI quota before provider work;
4. private context loaded server-side with workspace scope;
5. structured model output validated before use;
6. Workspace IDs, Evidence UUIDs and AI provenance IDs excluded from browser projection;
7. explicit user confirmation/revision before accepted durable Diagnosis/Design state.

Repeated `Try another` requests supersede older pending Diagnosis/Design proposals for the same context so later confirmation cannot silently consume stale AI state.

## 4. Primary UI — achieved

Phase 2 remains the understanding/learning surface. After a reviewed Principle exists, the sparse change loop is:

```text
Diagnose → Design → Do → Outcome → Review
```

The interface emphasizes one next action at a time:

- Diagnosis shows the root-cause hypothesis first; evidence/alternatives/uncertainty stay behind progressive disclosure;
- Design shows machine change and expected result first;
- Do shows only Actions belonging to the active Design;
- Outcome asks what actually happened and how it compares with expectation;
- Review asks one reflection question at a time.

No filler dashboard, small explanatory microcopy wall or generic project-management navigation was added.

## 5. Acceptance result

### End-to-end behavior — passed

Browser verification proves a real authenticated user can:

1. complete the Phase 2 Goal → Reality → Problem → Reflection → reviewed Principle path;
2. request and confirm a Diagnosis;
3. request and confirm a machine Design;
4. complete the Design Actions;
5. record actual Outcome Reality and compare it with expectation;
6. complete Outcome Review/Reflection;
7. reload and recover the durable chain.

### Diagnosis integrity — passed

Real-Postgres verification covers:

- cross-workspace rejection;
- same-workspace wrong-Goal/Problem rejection;
- Evidence provenance scoping;
- AI-suggestion replay prevention;
- accepted versus revised state;
- persisted contradictory evidence, alternatives, uncertainty and confidence.

### Design integrity — passed

Real-Postgres verification covers:

- matching Goal + Problem + Diagnosis chain;
- cross-workspace rejection;
- AI-suggestion replay prevention;
- atomic Design + Action persistence;
- accepted versus revised state.

### Execution and Outcome integrity — passed

Real-Postgres verification covers:

- cross-workspace Action mutation rejection;
- durable completion timestamps;
- Outcome blocked while Actions remain pending;
- cancelled Actions are not counted as completed but allow evaluation once none remain pending;
- Action completion alone leaves Design `active`;
- Outcome + Evidence + Observation atomicity;
- same-workspace semantic mismatch rollback;
- cross-workspace Outcome rejection;
- valid Outcome moves Design to `evaluated`;
- evaluated Design Actions cannot be reopened/changed;
- only one Outcome can evaluate a Design in Phase 3 v1.

### Review integrity — passed

Real-Postgres verification covers:

- Outcome Review linked to the same Goal + Problem;
- wrong-Goal linkage rejection at DB layer;
- duplicate Review rejection;
- expected and actual context preserved in Reflection;
- Phase 2 Reflection remains distinguishable because Phase 3 Review has an explicit Outcome link.

### Client/privacy boundary — passed

Projection tests prove the browser does not receive internal Workspace IDs, Diagnosis Evidence UUIDs, Outcome Evidence UUIDs or Observation UUIDs.

## 6. Audit → fix → re-audit findings

The required loop materially changed the implementation. Findings corrected include:

- async React context narrowing that failed typecheck;
- browser verification coupled to duplicate Outcome text instead of the Execution surface;
- missing explicit cross-workspace Design/Outcome proof;
- missing Design revision proof;
- Action completion potentially being confused with Design success;
- Actions remaining mutable after an Outcome had evaluated the Design;
- multiple Outcomes being structurally possible for one Design;
- stale pending AI proposals after `Try another`;
- editable Action inputs using unstable array-index React keys.

The fixes strengthened durable semantics rather than weakening tests.

## 7. Verification before readiness

Re-audit code head `3d590dd05cc4faa21fa9629f57060a9edac57b87` passed:

- Foundation #149 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit tests, serial real-Postgres integration tests, production build;
- Playwright #251 ✅ — authentication boundary, complete Phase 2 + Phase 3 browser loop, Outcome Review + reload, safe Knowledge projection, normal scrolling;
- Lint #484 ✅ — shell validation + Biome.

A final gate must run again on the documentation closeout head before merge.

## 8. Expected versus actual outcome

**Expected:** Principles can take one meaningful recognized Problem, form a user-reviewed root-cause hypothesis, redesign the relevant personal machine, execute a minimal set of commitments, observe whether Reality actually changed, and convert the result into new Reflection.

**Actual:** achieved on PR #57. Principles now has a durable path from understanding → machine change → execution → observed Reality → learning. It does not equate completed Actions with success.

## 9. Known limitations

Intentional limitations carried forward:

- the Phase 3 change surface becomes available from the next normal server render/navigation after the Phase 2 Principle is reviewed; the two client surfaces do not yet share a live state store;
- one active v1 execution chain is surfaced for the current selected Goal/Problem; no portfolio/project navigation exists;
- one Outcome per Design in Phase 3 v1;
- no reminders, recurring tasks, scheduling or generic project management;
- no longitudinal pattern learning or Self Model yet;
- no Organization Workspace collaboration;
- no structured business connectors;
- existing platform limitations such as password recovery and automated off-host restore remain outside this Phase.

## 10. Next boundary

**Phase 4 — Learning Engine + Self Model remains Planned and has not started.**

Phase 4 may use the longitudinal Goal, Problem, Diagnosis, Design, Action, Outcome, Reflection and Principle history created by Phases 2–3. Any inferred pattern must remain evidence-backed, inspectable and correctable.

## 11. Completion rule

Phase 3 is **Ready**, not Complete, until PR #57 is merged to `main` and source-of-truth closeout records the merge SHA and Phase 4 boundary.

Required process:

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

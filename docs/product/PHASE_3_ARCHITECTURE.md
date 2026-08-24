# Phase 3 — Design + Execution

**Status:** **Complete**  
**Started:** 2026-08-24  
**Merged:** 2026-08-24  
**Pull request:** #57  
**Merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`

Phase 3 continues the 5-Step Process from a recognized Problem into an observed machine change:

```text
Problem
  → Diagnosis
  → Design
  → Actions
  → Outcome
  → Review / Reflection
```

The objective was not project-management breadth. It was to prove that Principles can turn a recognized gap into a reasoned machine change, execute only the commitments required to test that change, observe actual Reality and learn from the difference between expectation and outcome.

## Product invariants achieved

### Diagnosis is not a solution

Diagnosis retains symptom, proximate cause, root-cause hypothesis, supporting/contradicting evidence, alternatives, uncertainty and optional confidence. The AI prompt forbids remedy/task proposals and tells the model to admit insufficient evidence. User confirmation/revision is required.

### Design changes the machine

Design retains machine change, rationale, expected result, success signal and 1–5 minimal Actions. Actions are subordinate to Design; generic project-management constructs were not introduced.

### Outcome is Reality, not task completion

Completing Actions never marks a Design successful. Outcome is blocked until no Actions remain pending and atomically records expected snapshot, actual result, user comparison, direct-user Evidence and accepted Goal-scoped Observation. Valid Outcome moves Design to `evaluated`; evaluated Actions become immutable. Phase 3 v1 permits one Outcome per Design.

### Review closes the loop

Post-Outcome Review asks what surprised the user and what the result taught them. It creates a completed Reflection linked to matching Outcome + Goal + Problem.

## Durable implementation

Migration `0003_design_execution.sql` adds:

- `diagnoses` and `diagnosis_evidence`;
- `designs`;
- `execution_actions`;
- `outcomes`;
- `outcome_reflections`;
- tenant/semantic composite constraints;
- suggestion replay constraints;
- one Outcome per Design;
- trigger preventing Action mutation after evaluation.

## AI/security boundary

Every Phase 3 AI mutation preserves same-origin mutation checks, authenticated owned Personal Workspace, durable per-workspace quota, server-side private context, validated structured output and safe client projection. Workspace IDs, Evidence UUIDs and AI provenance IDs stay server-side.

Repeated `Try another` requests supersede prior pending Diagnosis/Design proposals for the same context.

## UI result

After reviewed Phase 2 learning, the sparse change surface is:

```text
Diagnose → Design → Do → Outcome → Review
```

Root-cause hypothesis and machine change are primary; evidence/alternatives/uncertainty use progressive disclosure. No generic task/project shell was added.

## Acceptance result

Browser verification proves a real authenticated user can complete Phase 2, request/confirm Diagnosis, request/confirm Design, execute Actions, record actual Outcome, complete Outcome Review and reload the durable chain.

Real-Postgres verification covers cross-workspace and same-workspace semantic rejection, suggestion replay, accepted/revised semantics, atomic Design+Actions, pending-Action Outcome block, Action completion timestamps, cancelled Actions, Action completion ≠ Design success, atomic Outcome+Evidence+Observation, one Outcome per Design, evaluated-Action immutability, Outcome Review matching and duplicate Review rejection.

Safe projection tests prove internal Workspace/Evidence/Observation identifiers do not reach the browser execution state.

## Audit → fix → re-audit

Findings corrected:

- async UI context narrowing/type failure;
- E2E locator coupled to duplicate Outcome text;
- missing cross-workspace Design/Outcome proof;
- missing Design revision proof;
- Action completion vs Design success ambiguity;
- Action mutation after evaluation;
- multiple Outcomes per Design;
- stale pending AI proposals after retry;
- unstable editable Action React keys.

The fixes strengthened behavior rather than weakening tests.

## Final verification

Final pre-merge head: `175968077c26c38a7c47a21345737d592d238507`

- Foundation #154 ✅ — PostgreSQL 16, migrations 0001–0003, typecheck, unit, serial real-Postgres integration, production build;
- Lint #489 ✅;
- Playwright #256 ✅ — complete Phase 2 + Phase 3 path through Outcome Review and reload, auth boundary, safe Knowledge projection, normal scrolling;
- changed-file audit ✅ — 27 expected Phase 3 runtime/schema/tests/source-of-truth files; no Phase 4/Organizations/Projects/CRM implementation.

## Expected versus actual

**Expected:** one meaningful Problem becomes a user-reviewed root-cause hypothesis, machine change, execution, observed Outcome and new Reflection.

**Actual:** achieved and merged. Principles now has a durable path from understanding → machine change → execution → observed Reality → Reflection and does not equate completed work with success.

## Limitations carried forward

- normal server render/navigation currently bridges reviewed Phase 2 Principle to Phase 3 surface;
- one surfaced v1 execution chain for the selected Goal/Problem;
- one Outcome per Design;
- no generic Projects/kanban/assignment/recurrence/reminders/scheduling;
- no longitudinal pattern learning/Self Model yet;
- no Organization Workspace collaboration;
- no structured business connectors.

## Next boundary

**Phase 4 — Learning Engine + Self Model is Planned and has not started.**

Longitudinal inference must remain evidence-backed, inspectable and correctable.

# Phase 4 — Learning Engine + Self Model

**Status:** **Ready — verified on branch, not merged**  
**Started:** 2026-08-24  
**Branch:** `phase/4-learning-self-model`  
**Base:** Phases 0–3 Complete on `main`

Phase 4 adds a longitudinal learning layer:

```text
History
  → Pattern hypothesis
  → inspect cases / counter-evidence / uncertainty
  → accept / revise / reject
  → optionally revise a Principle
  → test again in future Reality
```

The Self Model is **not** a personality profile. It is the current set of user-accepted/revised Learning Pattern hypotheses supported by durable history.

## Product invariants

- Pattern ≠ immutable identity label.
- AI must not present personality, moral-worth, demographic or clinical/mental-health inference as fact.
- A proposal requires at least two distinct completed Reflection cases from the same Workspace.
- `recurring_pattern` requires cases from at least two distinct Problems; a same-Problem before/after cycle may support `design_learning` or `principle_effectiveness`, but not recurrence.
- Observation and inference remain separate: the Pattern is an inference over durable Goal/Problem/Reflection/Diagnosis/Design/Outcome history.
- Every Pattern retains supporting evidence, counter-evidence, uncertainty, optional confidence and exact Reflection cases.
- AI output remains pending until the user accepts or revises it.
- Rejected proposals create no durable Self Model Pattern row.
- Learning-driven Principle revision requires explicit user confirmation, preserves before/after wording and returns the Principle to `revised + testing`; it never creates `trusted` state.
- No charts, scores, trait feeds, streaks or generic analytics dashboard.

## Delivered durable slice

Migration `0004_learning_self_model.sql` adds:

### Learning Pattern

- Workspace + creator + optional AI provenance;
- kinds: `recurring_pattern`, `design_learning`, `principle_effectiveness`, `constraint_hypothesis`;
- statement, implication, evidence for/against, uncertainty, optional confidence;
- acceptance `accepted | revised`;
- lifecycle `active | applied | challenged | retired`;
- one durable Pattern per AI Suggestion.

### Pattern cases

`learning_pattern_cases` links each Pattern to completed Reflections with Workspace + Goal + Problem semantics.

Deferred PostgreSQL constraints enforce:

- at least two distinct Reflection cases per durable Pattern;
- `recurring_pattern` uses at least two distinct Problems;
- deleting/relinking cases cannot silently invalidate a Pattern.

### Principle revision history

`principle_learning_revisions` preserves:

- Pattern and Principle provenance;
- previous trigger/rule/rationale;
- revised trigger/rule/rationale;
- actor and timestamp.

Only an active accepted/revised Pattern can drive the revision. Applying it marks the Pattern `applied` and the Principle `revised + testing`.

## AI boundary

The model never receives durable Reflection/Principle UUIDs. Server-side history is mapped to ephemeral `C1…C8` case keys and `P1…` Principle keys. Unknown/invented keys are rejected before persistence.

Each proposal considers the **8 most recent completed Reflection cases**, returned to the model in chronological order. Model-facing text is bounded to prevent prompt/context growth with long history.

`Try another` rejects the previous pending Learning Suggestion before storing the replacement, preventing stale replay.

## UI

Authenticated `/learning` is intentionally sparse:

```text
Learning
What is your history teaching you?
```

- fewer than two completed Reflections → `Not enough history yet.` and no AI action;
- ready → `Find a pattern`;
- proposal → hypothesis + implication, with cases/evidence/counter-evidence/uncertainty behind progressive disclosure;
- user actions → Keep, Edit, Reject, Try another;
- accepted/revised Patterns render as compact Self Model hypotheses;
- relevant Patterns may expose `Revise this principle` with an explicit editable confirmation form.

No personality score, analytics dashboard or generic memory surface was added.

## Acceptance result

### Longitudinal integrity — passed

Verified that:

- fewer than two completed Reflections do not expose pattern generation in the browser and the API rejects insufficient history;
- only Workspace-scoped history is loaded;
- ephemeral case/Principle keys resolve only to supplied durable records;
- unknown or duplicate case keys fail;
- same-Problem `recurring_pattern` fails both model resolution and PostgreSQL persistence;
- a recurring Pattern across two distinct Problems succeeds;
- stale pending proposals are superseded.

### Pattern persistence / correctability — passed

Real-Postgres and browser tests prove:

- minimum two-case invariant;
- cross-Workspace and wrong Goal/Problem case links fail;
- one AI Suggestion cannot create multiple Patterns;
- replay fails;
- unchanged proposal → `accepted`;
- user-edited proposal → `revised`;
- rejection creates no Pattern and records rejected AI Suggestion;
- user can inspect cases, correct a Pattern, reload and recover it.

### Principle improvement — passed

Verified that:

- only active accepted/revised Patterns may revise a Principle;
- Pattern and Principle cannot cross Workspace boundaries;
- previous wording is preserved;
- Pattern→Principle provenance is durable;
- updated Principle becomes `revised + testing`, never `trusted`;
- replay of an already-applied Pattern revision fails;
- browser reload recovers the revised testing Principle.

### Privacy — passed

Learning browser projection excludes Workspace IDs, Evidence UUIDs, AI Suggestion IDs and internal Goal/Problem join IDs. Safe authorized Reflection IDs and case summaries remain available for inspectability.

## Audit findings corrected

The self-reinforcing loop found and fixed:

1. TypeScript inferred ephemeral Maps as template-literal keys and rejected validated runtime strings; Maps now explicitly use string keys while runtime validation remains strict.
2. AI validation alone could not prevent a malicious/edited client from relabeling same-Problem cases as `recurring_pattern`; the semantic rule is now also enforced by a deferred PostgreSQL constraint and real-Postgres boundary test.
3. Initial history loading could eventually prefer the oldest 40 Reflections and miss newer learning; proposal generation now uses the 8 most recent completed Reflection cases in chronological order with bounded model-facing excerpts.

## Verification

Final runtime head before source-of-truth closeout: `4ae0d5cefc51b8137f943720f68bbac86175ac30`

- Foundation #163 ✅ — PostgreSQL 16, migrations 0001–0004, typecheck, Learning unit tests, serial real-Postgres integration tests, production build;
- Lint #498 ✅;
- Playwright #265 ✅ — authentication boundary, insufficient-history state, full Phase 2 + 3 + 4 browser path, Pattern correction, Principle revision, reload/rejection, Knowledge privacy and normal scrolling.

## Expected versus actual outcome

**Expected:** durable personal history produces one evidence-backed, inspectable and correctable longitudinal Pattern that can improve a Principle without pretending the inference is fixed truth.

**Actual:** achieved on the branch. A real browser flow can create the two historical Reflection cases through normal product use, generate a Pattern, inspect evidence/counter-evidence/uncertainty, correct the hypothesis, keep it as revised Self Model state, use it to revise a Principle back into testing, reload that state, and reject a later bad proposal.

## Known limitations

- Pattern discovery is user-triggered; there are no proactive notifications or scheduled learning jobs.
- Each proposal considers the 8 most recent completed Reflection cases rather than performing semantic retrieval over an unlimited history.
- Phase 4 v1 applies one Pattern to at most one Principle revision; richer multi-revision history is deferred.
- Learning is a secondary `/learning` surface rather than a shared live state store with the People loop.
- No generic conversation memory, personality scoring, organization learning or structured business connectors.
- Existing platform gaps such as password recovery and automated off-host restore remain.

## Merge boundary

The current user request did **not** ask to merge. Phase 4 is therefore **Ready**, not Complete. It becomes Complete only after a later explicit merge to `main` and post-merge source-of-truth closeout.

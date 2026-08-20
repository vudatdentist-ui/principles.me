# Cortex Core

Cortex is the neutral shared intelligence layer for Personal OS and future Team OS. It reuses the working Personal Brain, conceptual lens classifier, RAGFlow retrieval, trust boundary, and grounding ideas from Council without exposing thinker or Council-member selection in its public contract.

## Public TypeScript contract

```ts
Cortex.run({ input, context?, decisionId? }, userId)
Cortex.continue(runId, answers, userId)
```

`run` returns either `{ status: "clarify", runId, clarification }` or `{ status: "complete", runId, result }`. `continue` returns the same union. The HTTP routes resolve `userId` server-side from the workspace session; clients never supply it.

The public result contains `framing`, `crux`, `evidence`, `conflicts`, `recommendation`, `confidence`, and `changeConditions`. Evidence uses explicit provenance kinds: `external_evidence`, `personal_memory`, `custom_principle`, and a reserved `organization_memory` kind for future Team OS work.

## Reasoning lifecycle

1. Retrieve Personal Memory and external RAG evidence in parallel.
2. Map the problem through neutral conceptual lenses.
3. Expose conflicts and weigh the evidence.
4. Clarify only when a missing fact could materially change the recommendation.
5. After one clarification round, retrieve and reason again and force completion with uncertainty/change conditions rather than asking indefinitely.
6. Persist the server-produced run state/result.

External retrieval is fail-closed: if there are no relevant external chunks, Cortex persists a low-confidence, ungrounded result and does not call the reasoner to invent sourced claims.

## Trust and provenance

All user input, clarification answers, Personal Memory, custom principles, and retrieved chunks are treated as untrusted data in the model prompt. Retrieved instructions cannot override the system contract. Post-model grounding drops prompt-injection leakage, persona-style attribution, unknown provenance keys, and evidence/interpretation claims without an external source key.

Personal Memory and custom principles can make application advice specific but remain visibly distinct from external evidence. Authors/books can still appear as source metadata in RAG titles; they are not simulated personas.

The client cannot persist Cortex output. `/api/cortex` accepts only input/context/decisionId and `/api/cortex/:runId/continue` accepts only clarification answers, both with strict schemas. The `CortexRun` record is written by the server-owned Cortex service and loaded/updated by `(runId, userId)`.

## Persistence and migration

Migration `0006_cortex_run.sql` adds one isolated generic `CortexRun` table. It intentionally does not alter Decision, Judgment, Outcome, Principle, or Learning Loop tables. `decisionId` is optional metadata rather than a foreign-key dependency so Ask, Goals, and Journal can all use Cortex without becoming Decision subtypes.

The migration is kept out of the shared Drizzle schema file to reduce merge conflicts with parallel workstreams. Cortex persistence is encapsulated in `lib/db/cortex-run-queries.ts`.

## Compatibility

The existing `/api/council` pipeline and legacy `Decision.council*` fields are untouched. Existing Council trust evals continue to run. Cortex reuses the same RAGFlow retrieval path and Personal Brain retrieval, but constructs neutral retrieval queries with no thinker members or thinker queries.

## Consuming Cortex

Ask, Goals, and Journal should depend only on the public response union, not RAGFlow, Council plans, thinker metadata, or Personal Brain internals.

- Start: `POST /api/cortex` with `{ input, context?, decisionId? }`.
- If `status === "clarify"`, render the returned questions and submit `{ answers: { [questionId]: value } }` to `POST /api/cortex/:runId/continue`.
- If `status === "complete"`, render the structured result and provenance kinds directly.
- Never submit or persist a Cortex `result` from the client.
- Goals and Journal may pass their domain text through `input/context`; no feature-specific adapter is required in Cortex Core.

## Tests

`scripts/verify-cortex-core.mts` covers strict anti-forgery request schemas, no thinker selection, grounded source keys, Personal Memory vs external provenance, hostile instruction/persona filtering, clarify, complete, reretrieval on continuation, single-round clarification behavior, user isolation, and fail-closed no-evidence behavior. The dedicated PR workflow also reruns the existing Council trust baseline.

# Journal + Reflection

## Scope

Journal is a Personal OS workstream for turning experience into reusable learning:

`EXPERIENCE → REFLECTION → PATTERN / OBSERVATION → CANDIDATE PRINCIPLE`

The feature is manual-first. Cortex assistance is optional and is accessed only through a Journal-owned adapter boundary.

## Domain and schema

Journal schema is isolated in `lib/journal/schema.ts` rather than appended to the shared database schema file.

### JournalEntry

- `id`
- `userId`
- `body`
- `occurredAt`
- timestamps

There is no required category or taxonomy before writing.

### JournalReflection

One current reflection per JournalEntry. It stores:

- free-form reflection text;
- optional pattern / observation;
- optional candidate principle statement and rationale;
- candidate state: `pending | adopted | rejected`;
- adopted Principle id after explicit adoption.

A candidate is not a Principle. Saving or editing a reflection never silently creates a Principle.

### JournalPrincipleLink

This is the Journal-specific provenance bridge to the existing `Principle` domain. It records:

- source JournalEntry;
- source JournalReflection;
- resulting / supported Principle;
- relation (`origin | supports`);
- owner.

Journal does not duplicate `Principle` or `PrincipleRevision`.

## Principle boundary

Adoption is an explicit user action.

`PATCH /api/journal/:id/reflection` with `action: "adopt"` runs one transaction:

1. validates that the entry, reflection, and pending candidate belong to the current workspace user;
2. creates an existing-domain `Principle`;
3. creates `PrincipleRevision` revision 1;
4. creates `JournalPrincipleLink` with relation `origin`;
5. marks the candidate `adopted` and records `adoptedPrincipleId`.

Edit keeps the candidate pending. Reject marks it rejected and creates no Principle.

## Privacy model

Journal content is owner-scoped at every API and query boundary through `getWorkspaceUser()` and `userId` predicates.

Owner checks are applied to:

- list;
- entry read/update/delete;
- reflection read/write;
- candidate edit/reject/adopt;
- Principle joins;
- Cortex assist;
- future Personal Memory context retrieval.

No Journal route or query logs entry/reflection body. No raw Journal content is added to telemetry.

The internal-auth isolation test proves that User B cannot list, read, mutate, assist on, or delete User A's Journal entry.

## Cortex boundary

`lib/journal/types.ts` defines `JournalCortexAdapter`:

```ts
reflect(context) -> JournalCortexSuggestion
```

`lib/journal/cortex.ts` currently supplies a small manual-safe fallback that returns a reflection question. It does not implement RAG, embeddings, vector search, Council selection, thinker simulation, or Cortex internals.

Cortex Core can replace this adapter later without changing Journal persistence or UI.

`listJournalMemoryContext({ userId, limit })` is the owner-scoped structured retrieval boundary for future Personal Memory ingestion. It deliberately does no cross-user lookup or semantic/vector retrieval.

## UI

Routes are feature-local:

- `/journal` — fast composer + chronological history;
- `/journal/:id` — experience + progressive reflection + optional candidate principle.

User-facing copy is limited to nouns/data/actions. Journal does not modify the shared navigation shell in this workstream; the shell owner can add a link to `/journal` during integration.

## API

- `GET /api/journal`
- `POST /api/journal`
- `GET /api/journal/:id`
- `PATCH /api/journal/:id`
- `DELETE /api/journal/:id`
- `PUT /api/journal/:id/reflection`
- `PATCH /api/journal/:id/reflection`
- `POST /api/journal/:id/reflection/assist`

## Tests

`tests/e2e/journal-reflection.test.ts` covers:

- quick create and browse;
- reflection + observation;
- candidate pending state;
- Cortex adapter assist;
- candidate edit;
- explicit adoption;
- Principle creation and Journal provenance;
- reject without Principle creation.

`tests/e2e/auth-isolation.test.ts` additionally covers Journal owner isolation under required internal auth.

## Migration integration notes

This branch adds `0006_journal_reflection.sql` and registers it in Drizzle migration metadata. Existing migration SQL is untouched.

Because multiple agents may add migrations concurrently, reconcile migration order immediately before merge:

1. sync the latest target branch;
2. if another migration has already taken `0006`, renumber this **new, unmerged** migration to the next ordinal and update its metadata entry;
3. do not edit or reorder already-merged migration history;
4. run `pnpm db:check`, migrate a fresh PostgreSQL database, then run typecheck/tests/build.

`drizzle.config.ts` reads both `lib/db/schema.ts` and `lib/journal/schema.ts`, keeping the Journal declarations isolated while still allowing schema validation/generation.

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Ready  
**Started:** 2026-08-23  
**Ready:** 2026-08-24  
**Branch:** `phase/1-secure-platform-durable-kernel`  
**Pull request:** #54

This document is the implementation contract and final re-audit record for Phase 1. It exists so implementation is judged against explicit ownership, security, provenance and operational criteria rather than screen count or code volume.

## 1. Objective

Create the smallest secure platform on which one real person can own durable Principles state without ambiguous identity, workspace, privacy, provenance, or provider-cost boundaries.

Phase 1 does **not** attempt the full People loop. It establishes the trusted substrate required for Phase 2.

## 2. Implemented architecture

### Authentication

The initial People release uses first-party email + password authentication.

- Passwords are hashed with Node `scrypt` and a unique random salt.
- Session tokens are random opaque values; only SHA-256 token hashes are stored.
- The browser receives one `HttpOnly`, `SameSite=Lax` session cookie, `Secure` in production.
- Sessions are durable in Postgres and can be revoked server-side.
- Production signup uses bootstrap mode: the first account requires a server-owned setup key, then signup closes automatically.
- Bootstrap closure is checked under an advisory transaction lock before the setup key is evaluated, so a closed installation does not reveal setup-key validity.
- OAuth, passkeys, password reset and email verification remain deliberately deferred.

### Workspace semantics

Every Phase 1 user owns exactly one Personal Workspace.

- Workspace is the authorization, provider-quota and private-retrieval boundary.
- Membership is modeled separately for future Organization workspaces.
- Session resolution selects only the Personal Workspace created by the authenticated user, even if an erroneous/future membership points at another person's Personal Workspace.
- Phase 1 does not implement workspace switching.

### PostgreSQL topology

PostgreSQL 16 is the durable system of record.

Production topology:

```text
Traefik / coolify network
        |
     web app
        |
principles-data (private Docker network)
        |
principles-postgres
        |
named volume
```

The database is not attached to the public Traefik network. Releases use additive migrations before canary promotion. A pre-migration `pg_dump` is kept in a separate backup volume with seven-snapshot retention; this is deployment safety, not a complete off-host disaster-recovery policy.

Migrations are recorded by filename plus SHA-256 checksum and reject mutation after application.

### Retrieval authorization

RAGFlow datasets are explicitly bound to a Workspace.

`/api/ask` performs this order:

```text
same-origin check
  -> authenticated session
  -> owned Personal Workspace
  -> durable workspace quota
  -> workspace RAG dataset bindings
  -> retrieval
  -> model
```

Configured `RAGFLOW_DATASET_IDS` may be assigned to the first Personal Workspace only. An explicit empty workspace dataset scope never falls back to global RAG dataset IDs.

Public live search receives only the user's public query; private RAG excerpts are never forwarded to Brave Search.

### Server/client evidence boundary

The model may receive normalized evidence on the server. The browser receives only a safe citation projection:

- citation key;
- title;
- short bounded snippet;
- source type/provider;
- public URL when safe;
- published/retrieved timestamps.

The browser does not receive private RAG dataset IDs, document IDs, chunk IDs, internal positions, full retrieved chunks, internal RAG URLs, or model-only provenance fields.

### Usage boundary

AI/provider usage is bounded by Postgres-backed rate limits.

- `/api/ask` is limited per workspace before retrieval/model calls.
- Authentication attempts are limited by a hashed proxy-aware IP scope.
- `X-Forwarded-For` last-hop precedence prevents attacker-controlled leading values or conflicting `X-Real-IP` from creating arbitrary buckets behind the production proxy.
- Limits are configuration, not a substitute for provider-side quotas.

### Durable kernel slice

Phase 1 created only durable structures already justified by the Kernel specification:

- User;
- Workspace + Membership;
- Session;
- Workspace evidence-source binding;
- Goal foundation;
- Evidence record;
- Observation;
- Reflection foundation;
- Principle candidate foundation;
- AI suggestion + acceptance state;
- append-oriented Activity Event;
- rate-limit bucket.

Workspace ownership is carried through the kernel. Composite foreign keys prevent cross-workspace provenance links for observation/evidence, principle/evidence and AI-suggestion/evidence relationships.

## 3. Acceptance result

All Phase 1 acceptance criteria passed re-audit.

### Identity and ownership — PASS

- First account can be created without database editing.
- Account + Personal Workspace are created atomically.
- Sign-in, refresh/session persistence and sign-out are browser-tested.
- Unknown-user sign-in spends a real scrypt operation and returns the same invalid-credential response.
- Raw passwords and raw session tokens are not persisted.
- Malformed percent-encoded session cookies are treated as absent instead of crashing the request.

### Authorization — PASS

- Unauthenticated `/api/ask` returns `401`.
- RAG dataset selection is workspace-scoped before retrieval.
- Goal repository reads are workspace-scoped.
- Real-Postgres integration tests prove cross-workspace Goal isolation.
- Integration tests prove a foreign Personal Workspace membership cannot hijack active session workspace selection.
- Public live search receives no private retrieved RAG text.

### Evidence projection — PASS

- Full normalized evidence stays server-side.
- `sources` use a distinct client contract.
- Unit/browser tests prove private IDs, full text and internal RAG URLs are absent from the client projection.

### Provider usage — PASS

- `/api/ask` consumes durable workspace quota before provider calls.
- Requests above the limit return `429` before retrieval/model work.
- Integration tests prove the rate-limit state survives database client reconnect/application process boundaries.

### Durable kernel and provenance — PASS

- Migration tracking is checksum-bound and idempotent.
- Kernel foundations carry workspace ownership.
- AI Suggestions have explicit pending/accepted/rejected/revised state.
- Database constraints reject cross-workspace evidence provenance.
- Activity Events record durable changes without becoming the source of truth.

### Operations — PASS

- Health includes DB configuration, reachability and Phase 1 schema readiness.
- CI runs migrations and integration tests against an actual disposable PostgreSQL 16.14 process under the unprivileged self-hosted runner account.
- Browser tests cover account creation, sign-out/sign-in, unauthenticated AI rejection, safe citation projection and normal document scrolling.
- Production deployment provisions/uses a persistent private Postgres container, takes a pre-migration snapshot, migrates before canary, verifies the authentication boundary, verifies exact public release SHA, and preserves DB state during application rollback.

### UI — PASS

- Signed-out UI exposes only identity actions required by the phase.
- Signed-in UI exposes account/workspace state and Q&A without adding a settings shell.
- No filler helper paragraphs or tiny explanatory microcopy were introduced.
- Request-time identity rendering is behind a React Suspense boundary compatible with Next 16 Cache Components.

## 4. Audit findings corrected

The implementation/audit/re-audit loop found and corrected issues that a code-only happy path would not have caught:

- self-hosted CI could not safely use Docker for PostgreSQL, so verification now uses an exact pinned user-space PostgreSQL 16 binary under the unprivileged runner user;
- missing shared-library ABI links in that binary bundle are hydrated generically and checked with `ldd`;
- Next 16 Cache Components request-time identity rendering was moved behind Suspense rather than disabling the cache model;
- malformed session-cookie percent encoding can no longer become a 500;
- session workspace selection can no longer drift to another person's Personal Workspace through membership state;
- authentication throttling no longer depends on an attacker-rotatable email identity and has hardened proxy-header precedence;
- client evidence projection cannot expose private RAG IDs, full chunks or internal URLs;
- database-level composite foreign keys prevent cross-workspace provenance links;
- applied migrations are checksum-locked;
- deployment clears/normalizes legacy DB environment assumptions and creates pre-migration safety snapshots;
- bootstrap closure no longer acts as a setup-key oracle;
- Postgres JSON writes use a JSON-serializable durable type contract rather than `Record<string, unknown>`;
- the browser sign-in test was corrected to submit the actual sign-in form rather than only switching form mode.

## 5. Explicitly deferred / known limitations

- Password reset and email verification.
- OAuth/passkeys.
- Organization workspaces, invites and workspace switching.
- Goal Discovery UX.
- Problem/Diagnosis/Design execution UI.
- Durable conversational history.
- Automatic persistence of every RAG/web result.
- Self-model or pattern learning.
- Full project/task management.
- UI for changing RAGFlow dataset bindings.
- Scheduled/off-host database backup and automated restore procedures.
- Session-management UI.

These are recorded limitations, not hidden Phase 1 scope.

## 6. Expected outcome versus actual outcome

**Expected:** Principles can safely begin learning about a real person without ambiguous ownership, privacy, provenance or uncontrolled provider-cost debt.

**Actual:** the secure substrate now exists on PR #54: first-party identity, owned Personal Workspace, durable PostgreSQL kernel foundations, workspace-scoped retrieval and quotas, strict evidence projection, provenance constraints, operational migration/backup/canary/rollback paths, and real-Postgres/browser verification. The product still does not implement the first complete Goal → Reality → Problem → Reflection → Principle user loop; that remains Phase 2.

Phase 1 is therefore **Ready for acceptance/merge**, not Complete while the PR remains unmerged.

## 7. Verification gate used for readiness

On implementation head `c8f6c32afc21124a8e8313c7daaad41b5639ade2` before this documentation closeout:

- Foundation run #75: PostgreSQL 16, migration, typecheck, unit tests, integration tests and production build passed.
- Playwright run #182: all 3 browser smoke tests passed.
- Lint run #416 passed, including deploy/CI shell syntax.
- Self-hosted runner diagnostics run #75 passed.

A final CI pass must also be green on the documentation closeout head before the PR is reported as Ready.

## 8. Audit loop

Phase 1 followed the required loop:

```text
Understand requirements
  -> define acceptance criteria
  -> implement
  -> audit
  -> fix
  -> re-audit
  -> final output check
  -> report result
```

The next major phase must not begin until Phase 1 is accepted and merged.

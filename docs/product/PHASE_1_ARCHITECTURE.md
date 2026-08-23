# Phase 1 — Secure Platform + Durable Kernel

**Status:** Active  
**Started:** 2026-08-23  
**Branch:** `phase/1-secure-platform-durable-kernel`

This document is the implementation contract for Phase 1. It exists so implementation can be audited against explicit criteria rather than judged by screen count or code volume.

## 1. Objective

Create the smallest secure platform on which one real person can own durable Principles state without ambiguous identity, workspace, privacy, provenance, or provider-cost boundaries.

Phase 1 does **not** attempt the full People loop. It establishes the trusted substrate required for Phase 2.

## 2. Decisions

### Authentication

Use first-party email + password authentication for the initial People release.

- Passwords are hashed with Node `scrypt` and a unique random salt.
- Session tokens are random opaque values; only SHA-256 token hashes are stored.
- The browser receives one `HttpOnly`, `SameSite=Lax` session cookie, `Secure` in production.
- Sessions are durable in Postgres and can be revoked server-side.
- Production signup defaults to **bootstrap mode**: the first account can be created, then public signup closes automatically.
- OAuth, passkeys, password reset and email verification are intentionally deferred rather than weakly approximated.

### Workspace semantics

Every Phase 1 user owns exactly one Personal Workspace.

- Workspace is the authorization and retrieval boundary.
- Membership is modeled separately so Organization workspaces can be added later without replacing identity.
- Phase 1 does not implement workspace switching because only the Personal Workspace is active.

### Postgres topology

PostgreSQL is the durable system of record.

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

The database is not attached to the public Traefik network.

Deployments run additive migrations before canary promotion. Migrations follow expand/contract compatibility so an application rollback is not blocked by a newly applied additive migration.

### Retrieval authorization

RAGFlow datasets are explicitly bound to a Workspace.

`/api/ask` resolves the authenticated session first, resolves the active Personal Workspace, loads only that workspace's RAG dataset bindings, and only then retrieves evidence or calls the model.

Configured `RAGFLOW_DATASET_IDS` may be assigned to the **first bootstrap Personal Workspace only**. They are never automatically shared with later accounts.

### Server/client evidence boundary

The model may receive normalized evidence on the server. The browser receives only a safe citation projection:

- citation key;
- title;
- short bounded snippet;
- source type/provider;
- URL when safe and available;
- published/retrieved timestamps.

The browser does not receive RAG dataset IDs, document IDs, chunk IDs, full retrieved chunks, internal positions, or model-only provenance fields.

### Usage boundary

AI/provider usage is bounded by a Postgres-backed application rate limiter.

- `/api/ask` is limited per workspace per time window.
- Authentication endpoints also have a bounded attempt window.
- Limits are configuration, not a substitute for provider-side quotas.

### Durable kernel slice

Phase 1 creates only the durable structures already justified by the Kernel specification:

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

The schema is intentionally not one table for every noun in the complete future ontology.

## 3. Acceptance criteria

Phase 1 is **Ready** only if every criterion below passes audit.

### Identity and ownership

- A new installation can create the first account without manual database editing.
- The account receives one Personal Workspace atomically.
- The user can sign in, refresh, remain signed in, and sign out.
- Invalid credentials do not reveal whether an email exists.
- Stored password material is one-way hashed; raw passwords and raw session tokens are not persisted.

### Authorization

- `/api/ask` returns `401` without a valid session.
- RAG dataset selection is resolved from the authenticated workspace before retrieval.
- Repository functions require workspace scope for private kernel state.
- Automated tests prove one workspace cannot read another workspace's Goal state.
- Public live search receives only the user's public search query, never private retrieved RAG text.

### Evidence projection

- Full normalized evidence stays server-side for synthesis.
- Streamed `sources` use a distinct client contract.
- Automated tests prove internal IDs/full text are absent from the client projection.

### Provider usage

- `/api/ask` consumes a workspace quota before provider calls.
- A request above the configured limit returns `429` without retrieval/model work.
- Rate-limit state is durable across app container restarts.

### Durable kernel and provenance

- Phase 1 migration is idempotently tracked.
- Goal, Evidence, Observation, Reflection, Principle candidate, AI Suggestion and Activity Event records carry workspace ownership.
- AI Suggestions have explicit pending/accepted/rejected/revised state and can retain evidence provenance.
- Activity Events can record durable changes without becoming the source of truth themselves.

### Operations

- Health reports database configuration/readiness/schema readiness in addition to AI/RAG readiness.
- CI runs migrations and integration tests against PostgreSQL.
- Browser tests cover first-account creation/sign-in and the authenticated Q&A surface.
- Production deployment starts/uses a persistent private Postgres container, migrates before canary, and keeps database state outside release containers.
- Production smoke verifies the authentication boundary; authenticated AI smoke is optional when dedicated smoke credentials are configured.
- Rollback assumptions and deferred security/product limitations are documented.

### UI

- Signed-out UI exposes only identity actions necessary for the phase.
- Signed-in UI exposes workspace/account state without building a settings shell.
- No helper paragraphs or tiny explanatory copy are added to fill space.
- Important state and actions remain readable at normal text sizes.

## 4. Explicitly deferred

- Password reset and email verification.
- OAuth/passkeys.
- Organization workspaces and workspace switching.
- Goal Discovery UX.
- Problem/Diagnosis/Design execution UI.
- Durable conversational history.
- Automatic persistence of every RAG/web result.
- Self-model or pattern learning.
- Full project/task management.

Deferral is intentional. These items must not be smuggled into Phase 1 through generic abstractions.

## 5. Audit loop

Implementation follows this loop:

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

The Phase 1 audit must include security boundaries, data isolation, operational migration/rollback, UI constraints, automated test coverage, and comparison of actual outcome with the Phase expected outcome.

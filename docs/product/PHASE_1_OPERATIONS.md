# Phase 1 Operations

**Phase:** Secure Platform + Durable Kernel  
**Status:** implementation/audit guide

## Production topology

```text
Internet
   |
Traefik / coolify
   |
principles-web
   |
principles-data (internal Docker network)
   |
principles-postgres
   |
principles-postgres-data (named volume)
```

`principles-postgres` is not attached to the public Traefik network. Application release containers join both `coolify` and the private `principles-data` network.

## First production account

Production uses `AUTH_SIGNUP_MODE=bootstrap`.

The deploy script creates a random `AUTH_BOOTSTRAP_SECRET` in the server-owned `.env.production` when one does not already exist. The secret is not printed by the deploy job.

To claim a new installation, the operator reads the setup key directly from the protected VPS environment file and enters it in the one-time **Setup key** field together with the first account email and password.

After the first user exists:

- bootstrap signup reports unavailable;
- the Create account control disappears;
- later attempts cannot create an account even with the setup key;
- the first Personal Workspace owns any configured bootstrap RAGFlow datasets.

Do not paste the setup key into issues, pull requests, chat transcripts or source control.

## Database migrations

`pnpm db:migrate` records applied migration filenames in `schema_migrations` and applies each new migration in a transaction.

Production deployment order:

```text
DB healthy
  -> build image
  -> apply additive migrations
  -> canary
  -> auth-boundary smoke
  -> release container
  -> public health/version check
  -> swap
```

Phase 1 follows an expand/contract migration rule. Migration `0001_secure_platform_kernel.sql` only adds new durable structures, so the previous RAG/live-search release can be restored at the application layer without requiring a destructive database rollback.

## Rollback

If a new application release fails before promotion, the existing primary application container remains active.

If failure happens during release swap, the deploy cleanup attempts to restore the renamed previous container.

The persistent Postgres container and named volume are not deleted by an application rollback.

Database downgrade automation is intentionally not implemented. Future migrations must remain backward-compatible until the previous application release is no longer a supported rollback target.

## Health

`/api/health` is ready only when:

- Postgres is configured and reachable;
- the Phase 1 schema migration is present;
- DeepSeek is configured;
- RAGFlow is configured and has a production-safe endpoint;
- Brave Search is configured when `LIVE_SEARCH_REQUIRED=true`.

The presence of bootstrap RAG dataset IDs is reported separately because dataset ownership becomes workspace state after account creation.

## Smoke behavior

Production canary smoke always verifies:

- health is ready;
- unauthenticated `/api/ask` returns `401`.

If dedicated `SMOKE_EMAIL` and `SMOKE_PASSWORD` are configured, smoke also signs in and exercises the full streamed Q&A path. Do not use a primary human password for automated smoke.

## Local verification

Run PostgreSQL 16 locally, set the `POSTGRES_*` variables from `.env.example`, then:

```bash
pnpm install
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
```

For local development, `AUTH_SIGNUP_MODE=open` avoids a bootstrap setup key. This is a development convenience and is not the production default.

## Known Phase 1 limitations

- no password reset;
- no email verification;
- no OAuth/passkeys;
- no organization workspaces or workspace switcher;
- no administrator UI for inviting later users;
- no UI for changing RAGFlow dataset bindings;
- no automated Postgres backup policy yet;
- fixed-window application rate limiting is intentionally simple;
- session revocation exists, but there is no session-management UI;
- Phase 1 stores kernel foundations but does not expose Goal/Reflection/Principle product workflows yet.

These limitations are explicit so later phases do not mistake infrastructure for a completed People product.

# Environment policy

`/.env.example` is the canonical variable contract. Real credentials are never committed.

## Environment matrix

| Environment | `APP_ENV` | Configuration source | Database | External AI/RAG |
| --- | --- | --- | --- | --- |
| Development | `development` | developer `.env.local` | local/dev Postgres | local or developer credentials |
| Test / CI | `test` | GitHub Actions `env` + disposable services | disposable PostgreSQL service | disabled unless a test explicitly mocks/enables it |
| Staging | `staging` | deployment-platform secrets | staging-only Postgres | staging keys/datasets only |
| Production | `production` | deployment-platform secrets | production Postgres | production keys/datasets only |

Staging and production both normally run with `NODE_ENV=production`; `APP_ENV` is the explicit product-environment discriminator.

## Secret rules

The following are server-only and must never be exposed through `NEXT_PUBLIC_*` variables or printed in CI logs:

- `AUTH_SECRET`
- `POSTGRES_URL`
- `BLOB_READ_WRITE_TOKEN`
- `REDIS_URL`
- `DEEPSEEK_API_KEY`
- `RAGFLOW_API_KEY`
- RAGFlow dataset identifiers when they reveal private corpus structure

`NEXT_PUBLIC_*` is browser-readable by design. Only values intentionally safe for every browser user may use that prefix.

## Development

Copy `.env.example` to `.env.local`, replace only the values needed for the workflow being exercised, then run:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

A migration command without `POSTGRES_URL` fails intentionally. Silent migration skipping is not allowed.

## Test / CI

CI must be self-contained. It starts a fresh PostgreSQL service, runs every migration from zero, verifies the resulting schema and cascade behavior, then builds and runs product smoke tests. CI does not depend on production secrets.

The Council smoke test deliberately runs without RAGFlow/DeepSeek credentials and asserts the product fails closed when no evidence is available.

## Staging

Staging uses separate database, provider credentials and RAGFlow datasets. Production data or credentials must not be copied into staging by default. Preview deployments should target staging resources or isolated test resources, never the production database.

## Production

Production secrets live only in the deployment platform / server secret store. They are injected at runtime and are not stored in GitHub, committed env files, browser bundles, screenshots or test artifacts.

Changes to the variable contract must update `.env.example` and this document in the same pull request.

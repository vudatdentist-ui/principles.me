# Milestone 8 — Release Readiness

This document is the operating contract for Principles v1. It turns the decision core into an internal product with authenticated users, isolated staging data, immutable deployments, smoke tests, backups, and a rollback path.

## Environment model

### Development

- Runs locally with `APP_ENV=development`.
- Internal auth is optional by default so local iteration can still use the anonymous workspace fallback.
- Local PostgreSQL and local/mock providers are acceptable.

### Staging / preview

- `APP_ENV=staging` and `INTERNAL_AUTH_REQUIRED=true`.
- Every pull request deploys as a separate Compose project: `principles-pr-<number>`.
- Every preview has its own PostgreSQL volume through `docker-compose.preview.yml`.
- Every preview receives its own hostname such as `pr-42.staging.principles.me`.
- `.env.staging` must point `RAGFLOW_DATASET_IDS` to a dedicated test dataset, not the production dataset.
- Preview cleanup runs when the pull request closes and removes the preview PostgreSQL volume.

A wildcard DNS record for the configured staging base domain must point to the Hostinger VPS/Traefik endpoint before preview deployment is enabled.

### Production

- Host: `principles.me`.
- `APP_ENV=production` and internal auth is required.
- Internal users are explicitly whitelisted through `INTERNAL_AUTH_EMAILS` and must have a non-anonymous `User` row with a password.
- Production uses `docker-compose.release.yml` and an immutable GHCR image tagged by the exact Git SHA.

## Internal user provisioning

Provision or rotate an internal account from an environment that can reach the target database:

```bash
POSTGRES_URL='postgresql://...' \
INTERNAL_USER_EMAIL='person@example.com' \
INTERNAL_USER_PASSWORD='use-a-long-password' \
INTERNAL_USER_NAME='Person' \
pnpm exec tsx scripts/provision-internal-user.ts
```

The email must also be present in `INTERNAL_AUTH_EMAILS` for that environment. The provisioning script is idempotent for a unique email and refuses ambiguous duplicate-email records.

## Required GitHub Environments

Create two GitHub Environments before enabling external deploy jobs:

- `staging`
- `production`

The repository keeps external deploy jobs disabled until their enable variable is explicitly set to `true`.

### Staging variables

- `STAGING_DEPLOY_ENABLED=true`
- `STAGING_BASE_DOMAIN=staging.principles.me` or the chosen wildcard domain
- `STAGING_DEPLOY_PATH=/srv/principles/releases`
- `STAGING_ENV_FILE=/srv/principles/.env.staging`
- `STAGING_SMOKE_COUNCIL_QUESTION=<known question with evidence in the test RAG dataset>`
- `STAGING_RAG_EVAL_CASE_IDS=<comma separated cases selected for the test dataset>`
- `STAGING_RAG_MIN_SCORE=0.5` initially; raise after a real live baseline is accepted

Recommended initial subset should span multiple trust dimensions, for example:

```text
source-01-cofounder-candor,citation-01-valid-trust,attribution-01-munger,lens-01-cofounder,conflict-01-trust-performance,application-01-test-trust,adversarial-01-ignore-system
```

Use only cases for which the staging RAG dataset intentionally contains relevant evidence.

### Staging secrets

- `STAGING_SSH_HOST`
- `STAGING_SSH_USER`
- `STAGING_SSH_KEY`
- `PREVIEW_DB_PASSWORD`
- `STAGING_SMOKE_EMAIL`
- `STAGING_SMOKE_PASSWORD`

The staging smoke email must be included in `.env.staging` `INTERNAL_AUTH_EMAILS`.

### Production variables

- `PRODUCTION_DEPLOY_ENABLED=true`
- `PRODUCTION_HOST=principles.me`
- `PRODUCTION_DEPLOY_PATH=/srv/principles/releases`
- `PRODUCTION_ENV_FILE=/srv/principles/.env.production`
- `PRODUCTION_SMOKE_COUNCIL_QUESTION=<stable source-backed smoke question>`
- `PRODUCTION_BACKUP_ENABLED=true` after the backup secret is configured and the first manual backup is verified

### Production secrets

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_SMOKE_EMAIL`
- `PRODUCTION_SMOKE_PASSWORD`
- `PRODUCTION_POSTGRES_URL`

The production smoke account should be a normal low-privilege internal account. Its email must be whitelisted in `.env.production`.

## Deployment pipeline

The canonical `.github/workflows/ci.yml` implements the release sequence.

For a pull request:

```text
PR
→ static/type/schema/trust gates
→ local product E2E
→ two-user auth isolation E2E
→ build and push immutable GHCR image
→ deploy isolated preview + test DB
→ provision staging smoke user
→ deployed Playwright smoke
→ live RAG eval subset
→ eligible to merge
```

External preview steps run only when `STAGING_DEPLOY_ENABLED=true`.

After merge to `main`:

```text
main push
→ same local quality/trust/browser/auth gates
→ build and push exact main SHA
→ production migration
→ production container switch
→ /api/health readiness check
→ production Playwright smoke
```

Production deployment runs only when `PRODUCTION_DEPLOY_ENABLED=true`.

## Production smoke contract

`tests/e2e/release-smoke.test.ts` intentionally mutates very little data:

1. load the public homepage;
2. sign in through the real internal login flow;
3. verify the authenticated session;
4. create one smoke Decision;
5. call the real Council endpoint;
6. require a grounded answer;
7. require returned evidence and citations;
8. verify every citation resolves to a returned reference;
9. verify no fatal browser error occurred;
10. delete the smoke Decision in a `finally` block.

The smoke test therefore exercises the production app, authentication, database, RAGFlow, DeepSeek, provenance, and cleanup path without accumulating normal test Decisions.

## Authentication and isolation

Staging and production never silently create anonymous workspace users.

The internal auth flow uses:

- email/password against a non-anonymous `User` row;
- an environment email whitelist;
- an HTTP-only SameSite session cookie;
- HMAC-signed session payload with expiry;
- proxy-level route protection;
- a second identity check inside `getWorkspaceUser()` before owner-scoped queries run.

`tests/e2e/auth-isolation.test.ts` creates two real authenticated users in separate browser contexts and proves that User B cannot read, mutate, attach a Principle to, or delete User A's Decision and cannot see User A's Principle in `/api/principles`.

## Error monitoring

Application and Council logs are structured JSON on stdout/stderr so the Hostinger/Coolify container log collector can route them to the chosen log destination later without changing the application contract.

Signals available in v1:

- `app_error kind=client` — fatal client render error;
- `app_error kind=api status=500` — Next server/request failure;
- `app_error kind=database code=DB_HEALTH_FAILED` — database readiness failure;
- `app_error kind=migration` — migration command failed;
- `council_run errorCode=RAGFLOW_UNAVAILABLE` — all retrieval queries unavailable;
- `council_run errorCode=RAGFLOW_FAILED` — retrieval stage threw;
- `council_run errorCode=RAGFLOW_NOT_CONFIGURED` — missing retrieval configuration;
- `council_run errorCode=DEEPSEEK_FAILED` — synthesis provider failed;
- `council_run grounded=false` — Council did not produce grounded evidence-backed reasoning.

These records intentionally avoid question/context/evidence text, prompts, credentials, user IDs, tokens, and raw exception messages.

`GET /api/health` is public for the load balancer and release smoke. It verifies database access, internal-auth configuration, and provider configuration and exposes the deployed `APP_VERSION`/Git SHA.

## Database backups

`.github/workflows/backup-production.yml` creates a PostgreSQL custom-format dump every day when `PRODUCTION_BACKUP_ENABLED=true`.

Each backup run:

1. runs `pg_dump --format=custom --no-owner --no-acl`;
2. verifies that `pg_restore --list` can parse the dump;
3. stores a SHA-256 checksum;
4. uploads the dump/list/checksum as the workflow artifact `production-db-backup-<run-id>` with 30-day retention.

**Backup location:** GitHub Actions → `Production DB Backup` workflow run → Artifacts.

Before enabling the schedule, run the workflow manually once and confirm the artifact can be downloaded and listed with `pg_restore --list`.

## Restore procedure

Do not restore directly over the only production database as the first step.

1. Download the chosen backup artifact from the `Production DB Backup` workflow.
2. Verify its `.sha256` file.
3. Create a fresh PostgreSQL database or restore target.
4. Set `RESTORE_DATABASE_URL` to that fresh target.
5. Verify only:

```bash
BACKUP_FILE=./principles-YYYYMMDDTHHMMSSZ.dump \
RESTORE_DATABASE_URL='postgresql://...' \
./ops/restore-backup.sh
```

The helper exits before writing unless `ALLOW_RESTORE=YES` is present.

6. Perform the restore:

```bash
ALLOW_RESTORE=YES \
BACKUP_FILE=./principles-YYYYMMDDTHHMMSSZ.dump \
RESTORE_DATABASE_URL='postgresql://...' \
./ops/restore-backup.sh
```

7. Run `pnpm db:migrate` against the restored database.
8. Point a staging instance at the restored database and run the deployed smoke test.
9. Only after verification should traffic/config be switched to the restored database.

## Rollback procedure

Application rollback must not require exploratory SSH work.

Use Actions → `Rollback Production` → Run workflow and provide the exact 40-character SHA from a previously successful production release.

The workflow:

1. verifies the immutable GHCR image exists;
2. connects to the production Hostinger VPS;
3. pulls the exact image;
4. runs migrations through the same release script;
5. switches the production service to the target SHA;
6. waits for `/api/health`;
7. runs the production smoke test.

For v1, database migrations should remain backward-compatible/additive whenever possible. A code rollback does not automatically reverse destructive schema changes. If a release requires a destructive migration, treat database rollback as a separate restore operation and document it in that release PR.

## v1.0.0-rc.1 gate

Do not create the release candidate tag merely because code has reached `main`. `v1.0.0-rc.1` is ready only after all of these are true:

- canonical local CI is green;
- 50-case deterministic Council trust suite is green;
- two-user auth isolation is green;
- a real PR preview deploy succeeds;
- deployed staging Playwright smoke succeeds;
- staging live RAG subset succeeds;
- production deploy succeeds;
- production smoke succeeds and cleans up its Decision;
- a production backup artifact has been created and verified;
- one rollback drill to a known prior image succeeds;
- no known Critical release issue remains.

Then give `v1.0.0-rc.1` to the internal group for real Decisions.

## Dogfood → v1.0.0

Collect feedback in these buckets:

- bugs;
- confusing UX;
- poor answers;
- bad retrieval;
- missing workflow.

Severity for release triage:

- **Critical:** data loss/cross-user data exposure/auth bypass, unsafe grounding failure presented as sourced, production unavailable with no rollback.
- **High:** core Decision → Council → Judgment → Principle → Review flow broken, persistent incorrect provenance/citations, repeated provider failure without a useful fallback.
- **Medium/Low:** non-blocking UX, wording, visual, or workflow improvements.

Before `v1.0.0`, Critical and High issues discovered during RC dogfooding must be fixed or explicitly removed from the v1 supported workflow. Run the same staging and production release gates again on the final candidate before tagging `v1.0.0`.

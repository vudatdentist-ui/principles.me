# Milestone 8 — Release Readiness

This is the v1 operating contract for Principles. Coolify owns deployment lifecycle; GitHub Actions owns application quality gates and verifies the deployed release. Do not operate a second SSH/GHCR deployment path in parallel.

## Environment model

### Development

- `APP_ENV=development`.
- Local PostgreSQL and local/mock providers are acceptable.
- Internal authentication is optional so local development can retain the anonymous workspace fallback.

### Staging / PR previews

Use Coolify Preview Deployments for pull requests.

Required properties:

- preview code runs separately from production;
- preview environment variables are scoped separately from production;
- preview DB is not the production DB;
- `APP_ENV=staging`;
- `APP_VERSION=$SOURCE_COMMIT`;
- `INTERNAL_AUTH_REQUIRED=true`;
- `RAGFLOW_DATASET_IDS` points to a dedicated test dataset;
- the staging smoke user exists in the preview/staging identity store and is included in `INTERNAL_AUTH_EMAILS`;
- preview domain follows `pr-{{pr_id}}.<STAGING_BASE_DOMAIN>` so GitHub can derive it deterministically.

Create wildcard DNS for `*.<STAGING_BASE_DOMAIN>` before enabling the verification job. Keep public/fork preview deployments disabled unless running untrusted PR code on the deployment server is explicitly acceptable.

### Production

Production remains the existing Hostinger/Coolify application using `docker-compose.hostinger.yml` and `principles.me`.

Required runtime configuration:

- Coolify GitHub App connected to this repository;
- configured branch: `main`;
- Coolify Auto Deploy enabled;
- `APP_ENV=production`;
- `APP_VERSION=$SOURCE_COMMIT`;
- `INTERNAL_AUTH_REQUIRED=true`;
- `AUTH_SECRET` set to a strong server-only secret;
- `INTERNAL_AUTH_EMAILS` contains only approved internal accounts;
- production database/provider settings are present;
- the production smoke account is a normal low-privilege whitelisted user.

`GET /api/health` is the release truth endpoint. A release is ready only when it returns HTTP 200, `status: "ok"`, and the exact expected Git SHA in `version`.

## Internal user provisioning

Provision or rotate an internal account from an environment that can reach the target database:

```bash
POSTGRES_URL='postgresql://...' \
INTERNAL_USER_EMAIL='person@example.com' \
INTERNAL_USER_PASSWORD='use-a-long-password' \
INTERNAL_USER_NAME='Person' \
pnpm exec tsx scripts/provision-internal-user.ts
```

The email must also be included in `INTERNAL_AUTH_EMAILS`. The script is idempotent for a unique email and refuses ambiguous duplicate-email records.

## GitHub release verification configuration

Create GitHub Environments:

- `staging`
- `production`

Repository variables evaluated before Environment secrets are loaded:

- `STAGING_VERIFY_ENABLED=true` after Coolify previews and wildcard DNS work;
- `PRODUCTION_VERIFY_ENABLED=true` after production health/version reporting and smoke credentials work.

### Staging variables

- `STAGING_BASE_DOMAIN=<preview base domain>`
- `STAGING_SMOKE_COUNCIL_QUESTION=<stable question covered by the test RAG dataset>`
- `STAGING_RAG_EVAL_CASE_IDS=<comma-separated eval case ids>`
- `STAGING_RAG_MIN_SCORE=0.5` initially; tighten only after a real live baseline is accepted.

Recommended initial subset should span multiple trust dimensions, for example:

```text
source-01-cofounder-candor,citation-01-valid-trust,attribution-01-munger,lens-01-cofounder,conflict-01-trust-performance,application-01-test-trust,adversarial-01-ignore-system
```

Staging secrets:

- `STAGING_SMOKE_EMAIL`
- `STAGING_SMOKE_PASSWORD`

### Production variables

- `PRODUCTION_HOST=principles.me`
- `PRODUCTION_SMOKE_COUNCIL_QUESTION=<stable source-backed smoke question>`

Production secrets:

- `PRODUCTION_SMOKE_EMAIL`
- `PRODUCTION_SMOKE_PASSWORD`

No production SSH key, deployment path, GHCR credential, or database URL is required by the release verification workflow.

## Canonical deployment pipeline

### Pull request

```text
PR
→ static/type/schema/trust gates
→ local product Playwright E2E
→ two-user auth-isolation E2E
→ Coolify PR preview deployment
→ GitHub waits for /api/health.version == PR head SHA
→ deployed Playwright smoke
→ live RAG eval subset
→ eligible to merge
```

The first three GitHub gates must pass independently of Coolify. When `STAGING_VERIFY_ENABLED=true`, the preview verification job turns the Coolify deployment into a required release signal. A skipped preview job is not evidence that staging passed.

### Merge to main

```text
merge to main
→ Coolify GitHub App auto-deploys the main commit
→ Foundation CI runs the same local quality/browser/auth gates
→ GitHub waits for /api/health.version == main GITHUB_SHA
→ production Playwright smoke
```

GitHub does not deploy production. This preserves one deployment owner and prevents two systems from racing to mutate the same container.

`Verify Production Release` can be run manually with an expected full SHA after a rollback, DNS repair, or other recovery event.

## Production smoke contract

`tests/e2e/release-smoke.test.ts` deliberately mutates only one temporary Decision:

1. load the public site;
2. sign in through the real internal login flow;
3. verify the authenticated session;
4. create one smoke Decision;
5. call the real Council endpoint;
6. require a grounded answer;
7. require evidence and citations;
8. verify each citation resolves to a returned reference;
9. verify no fatal browser error occurred;
10. delete the smoke Decision in a `finally` block.

This simultaneously exercises routing, authentication, DB persistence, RAGFlow, DeepSeek, provenance and cleanup without accumulating ordinary test data.

## Authentication and data isolation

Staging and production never silently create anonymous workspace users.

The internal auth boundary uses:

- email/password against a non-anonymous `User` row;
- explicit environment email whitelist;
- HTTP-only SameSite session cookie;
- HMAC-signed session payload with expiry;
- proxy-level route protection;
- a second identity check inside `getWorkspaceUser()`;
- owner-scoped Decision and Principle queries.

`tests/e2e/auth-isolation.test.ts` creates two authenticated users in separate browser contexts and proves User B cannot read, mutate, attach a Principle to, or delete User A's Decision, and cannot see User A's Principle in `/api/principles`.

## Error monitoring

Application and Council events are structured JSON on stdout/stderr so Coolify/container logs can collect them without exposing prompts or secrets.

Signals include:

- `app_error kind=client` — fatal client render;
- `app_error kind=api status=500` — server/request failure;
- `app_error kind=database code=DB_HEALTH_FAILED` — DB readiness failure;
- `app_error kind=migration` — migration failure;
- `council_run errorCode=RAGFLOW_UNAVAILABLE` — retrieval provider unavailable;
- `council_run errorCode=RAGFLOW_FAILED` — retrieval threw;
- `council_run errorCode=RAGFLOW_NOT_CONFIGURED` — retrieval configuration missing;
- `council_run errorCode=DEEPSEEK_FAILED` — synthesis provider failure;
- `council_run grounded=false` — no grounded evidence-backed answer.

These records intentionally omit decision/question/context/evidence text, prompts, credentials, tokens, user IDs and raw exception messages.

Configure Coolify notifications for deployment failure and container health. Backup success/failure notifications should also be enabled once scheduled backups are configured.

## Database backups

Use Coolify scheduled PostgreSQL backups rather than giving a GitHub runner direct production DB access.

Recommended v1 policy:

- create a scheduled PostgreSQL backup at least daily;
- use PostgreSQL custom-format dumps;
- keep a short local retention window on the VPS, for example 7 days;
- strongly prefer an S3-compatible copy with a longer retention window, for example 30 days;
- enable backup success/failure notifications.

**Where is the backup?** The primary operational location is the scheduled backup configured on the production PostgreSQL resource in Coolify. For disaster recovery, an S3-compatible copy should be treated as the safer authoritative off-server copy once configured.

A successful backup is not a restore test. Before declaring M8 complete, restore one recent backup into a disposable non-production database and prove the application can use it.

`ops/restore-backup.sh` remains as a guarded helper for restore drills. It requires `ALLOW_RESTORE=YES` before performing a write.

Restore drill:

1. choose a recent Coolify backup;
2. verify the backup file is readable by `pg_restore --list`;
3. restore into a disposable database, never directly over the only production DB;
4. run current migrations against the restored DB;
5. point a staging instance at the restored DB;
6. run the deployed smoke test;
7. record the date, backup identifier and result.

## Rollback

Application rollback must not require exploratory SSH work.

Primary path:

1. Coolify → application → Deployments;
2. select a known-good previous deployment/local image and use Coolify Rollback;
3. run GitHub Actions → `Verify Production Release`, passing the expected full SHA;
4. require exact-SHA health + production smoke to pass;
5. restore repository consistency by reverting the bad merge/commit on `main`; Coolify then auto-deploys that revert through the normal path.

Coolify rollback depends on the previous local image still being available. Keep at least one known-good prior release locally until the next release has passed production verification.

Database rollback is separate. M8 migrations should remain additive/backward-compatible whenever possible. A destructive migration requires an explicit database restore plan in its release PR.

## v1.0.0-rc.1 gate

Do not tag `v1.0.0-rc.1` merely because M8 code reaches `main`. The release candidate is ready only when all are true:

- canonical local CI is green;
- deterministic 50-case Council trust suite is green;
- two-user auth isolation is green;
- a real Coolify PR preview is deployed and reports the expected PR SHA;
- deployed staging Playwright smoke is green;
- staging live RAG subset is green;
- production DNS resolves to the Principles application, not a parked/other site;
- Coolify auto-deploy of a `main` commit is verified by exact SHA;
- production smoke is green and cleans up its Decision;
- a scheduled production PostgreSQL backup has been created and verified;
- one restore drill into a disposable DB succeeds;
- one application rollback drill succeeds and is re-verified by SHA + smoke;
- no known Critical release issue remains.

## Dogfood → v1.0.0

Give `v1.0.0-rc.1` to the internal group for real Decisions and collect:

- bugs;
- confusing UX;
- poor answers;
- bad retrieval;
- missing workflow.

Release severity:

- **Critical:** data loss, cross-user exposure/auth bypass, unsafe grounding presented as sourced, or production unavailable without a validated recovery path;
- **High:** core Decision → Council → Judgment → Principle → Review path broken, persistent incorrect provenance/citations, or repeated provider failure without a usable failure state;
- **Medium/Low:** non-blocking UX, wording, visual or workflow issues.

Before `v1.0.0`, fix all Critical and High issues or remove the affected workflow from v1 support, then rerun the staging and production release gates on the final candidate.

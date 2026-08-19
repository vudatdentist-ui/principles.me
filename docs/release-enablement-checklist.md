# Release pipeline enablement checklist

Principles production already auto-deploys through Coolify. The repository therefore verifies Coolify releases rather than deploying over SSH.

A skipped external verification job is not a passed release gate.

## 1. Production DNS

Before enabling production verification:

- `principles.me` resolves to the Hostinger/Coolify endpoint;
- `www.principles.me` either resolves to the same application or intentionally redirects to the canonical host;
- HTTPS is valid;
- `GET https://principles.me/api/health` reaches Principles rather than a parked or unrelated site.

## 2. Coolify production application

Confirm on the existing Principles application:

- source is the correct private GitHub repository via the GitHub App;
- configured production branch is `main`;
- Auto Deploy is enabled;
- deployment uses the existing `docker-compose.hostinger.yml` / production configuration;
- `APP_ENV=production`;
- `APP_VERSION=$SOURCE_COMMIT`;
- `INTERNAL_AUTH_REQUIRED=true`;
- `AUTH_SECRET` is set;
- `INTERNAL_AUTH_EMAILS` contains only approved internal users;
- production DB, RAGFlow and DeepSeek configuration is present;
- deployment/container failure notifications are enabled.

Provision a low-privilege production smoke account and include its email in `INTERNAL_AUTH_EMAILS`.

## 3. Coolify PR previews

Enable Coolify Preview Deployments for the same GitHub App/application.

Configure:

- Preview URL Template compatible with `pr-{{pr_id}}.<STAGING_BASE_DOMAIN>`;
- wildcard DNS for `*.<STAGING_BASE_DOMAIN>` pointing to the deployment server;
- preview-only environment variables, never production secrets;
- `APP_ENV=staging`;
- `APP_VERSION=$SOURCE_COMMIT`;
- `INTERNAL_AUTH_REQUIRED=true`;
- a non-production/test database;
- a dedicated test RAG dataset;
- a preview smoke user.

Keep public/fork preview deployments disabled unless running untrusted contributor code is explicitly acceptable.

Open or update a PR and confirm Coolify creates a preview and removes the automatic preview when the PR closes/merges.

## 4. GitHub staging verification

Create GitHub Environment `staging`.

Repository variable:

- `STAGING_VERIFY_ENABLED=true`

Staging variables:

- `STAGING_BASE_DOMAIN`
- `STAGING_SMOKE_COUNCIL_QUESTION`
- `STAGING_RAG_EVAL_CASE_IDS`
- `STAGING_RAG_MIN_SCORE`

Staging secrets:

- `STAGING_SMOKE_EMAIL`
- `STAGING_SMOKE_PASSWORD`

Then update an open PR and require `Coolify preview smoke + RAG subset` to pass. It must wait until `/api/health.version` equals the PR head SHA before testing.

## 5. GitHub production verification

Create GitHub Environment `production`.

Repository variable:

- `PRODUCTION_VERIFY_ENABLED=true`

Production variables:

- `PRODUCTION_HOST=principles.me`
- `PRODUCTION_SMOKE_COUNCIL_QUESTION`

Production secrets:

- `PRODUCTION_SMOKE_EMAIL`
- `PRODUCTION_SMOKE_PASSWORD`

After a merge to `main`, `Coolify production deployment verification` must wait until `/api/health.version` equals the exact `main` push SHA, then pass the low-mutation production smoke test.

The manual `Verify Production Release` workflow provides the same exact-SHA + smoke verification after a rollback or recovery event.

## 6. Database backups in Coolify

On the production PostgreSQL resource:

- add a scheduled backup at least daily;
- verify the selected production database is included;
- keep a local retention window;
- configure S3-compatible off-server storage if available;
- enable backup success/failure notifications.

Before treating backups as release-ready:

1. run or wait for one real scheduled backup;
2. verify the dump can be listed/read;
3. restore it into a disposable non-production database;
4. run current migrations;
5. point staging at the restored database;
6. run the deployed smoke test;
7. record the restore drill result.

## 7. Rollback drill

Before the RC tag:

1. identify one known-good previous production deployment in Coolify;
2. use Coolify Rollback to that local image;
3. run `Verify Production Release` with that release SHA;
4. require exact-SHA health and smoke to pass;
5. return to the intended current version through the normal Git history/auto-deploy path;
6. verify production again.

Do not rely on reversing destructive migrations during an application rollback. Destructive DB changes require a separate restore plan.

## 8. RC gate

`v1.0.0-rc.1` is eligible only after all of the following have real evidence:

- Foundation CI green;
- Council Trust green;
- local Playwright product smoke green;
- two-user auth isolation green;
- Coolify PR preview exact-SHA verification green;
- staging deployed smoke green;
- staging live RAG subset green;
- production DNS points to Principles;
- Coolify main auto-deploy exact-SHA verification green;
- production smoke green with cleanup;
- production scheduled backup verified;
- disposable restore drill green;
- rollback drill green;
- no open Critical release issue.

# Release pipeline enablement checklist

The release workflows are intentionally present before external deployment credentials are enabled. This lets CI prove application correctness without accidentally deploying to a partially configured VPS.

## Repository-level enable flags

These three variables must be **repository variables**, not only GitHub Environment variables, because they are evaluated in job-level `if:` expressions before an Environment job starts:

- `STAGING_DEPLOY_ENABLED=true`
- `PRODUCTION_DEPLOY_ENABLED=true`
- `PRODUCTION_BACKUP_ENABLED=true`

Leave each unset or `false` until its corresponding environment is fully configured.

## Staging Environment

Create a GitHub Environment named `staging` and configure the remaining staging variables/secrets listed in `docs/release-readiness.md`. Before setting `STAGING_DEPLOY_ENABLED=true`, verify:

- wildcard DNS for the staging base domain resolves to the Hostinger/Traefik endpoint;
- the configured staging env file exists on the VPS;
- `.env.staging` uses `APP_ENV=staging`, internal auth, a dedicated RAGFlow test dataset, and never the production database;
- the smoke account email is in `INTERNAL_AUTH_EMAILS`;
- the deploy SSH principal can run Docker Compose but is not a general shared password account;
- the preview deploy path exists or can be created by the SSH principal.

Then enable staging and use an open pull request to prove the full preview sequence. Closing that pull request must remove the Compose project and its preview PostgreSQL volume.

## Production Environment

Create a GitHub Environment named `production`. Before setting `PRODUCTION_DEPLOY_ENABLED=true`, verify:

- `PRODUCTION_HOST=principles.me`;
- the production env file exists and contains the real database/provider configuration;
- the production smoke user is a normal whitelisted internal user;
- the production SSH principal can pull GHCR images and operate the release Compose project;
- the current production database has a verified backup;
- at least one previous immutable image SHA is known for a rollback drill.

GitHub Environment protection rules can require manual approval for production without changing the workflow definition.

## Backup enablement

Before setting `PRODUCTION_BACKUP_ENABLED=true`:

1. configure `PRODUCTION_POSTGRES_URL` in the `production` Environment;
2. manually run `Production DB Backup` once;
3. download the resulting artifact;
4. verify the SHA-256 file and `pg_restore --list` locally or in a restore test job;
5. restore it to a non-production database with `ops/restore-backup.sh`;
6. point staging at that restored database and run the release smoke test.

Only then enable the daily schedule.

## RC gate

A skipped staging, production, backup, or rollback job is **not** evidence that the release gate passed. `v1.0.0-rc.1` should be created only after each external gate has run successfully at least once with the real configured environment.

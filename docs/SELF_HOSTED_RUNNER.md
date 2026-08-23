# CI and deployment runners

This repository intentionally uses two runner classes after Phase 1.

## Disposable verification jobs

Jobs that require an isolated PostgreSQL service run on GitHub-hosted `ubuntu-latest` runners:

- Foundation typecheck/unit/integration/build verification;
- Playwright browser verification;
- the release-verification job before production deployment.

This keeps database integration tests disposable and avoids granting Docker daemon access to the long-lived self-hosted CI user.

Pull-request verification receives no production secrets.

## Self-hosted deployment runner

One dedicated GitHub Actions self-hosted Linux x64 runner remains registered for low-privilege repository jobs and deployment orchestration.

Required labels:

```text
self-hosted
linux
x64
principles-ci
```

The self-hosted runner is used for:

- lint/shell validation;
- runner diagnostics;
- the protected production deployment job after release verification passes.

## Capacity

Run one `principles-ci` runner service unless the repository concurrency policy is deliberately changed. A single runner process executes one self-hosted job at a time.

## Security boundary

Run the Actions runner as a dedicated unprivileged Linux user such as `principles-ci`.

Do not run the runner as root. Do not grant passwordless sudo or Docker daemon access merely to support pull-request tests. Production credentials are available only to the protected production deployment job.

If CI and production share a physical host, keep the CI user separate from the deploy/application user and keep `.env.production` unreadable to CI.

## Host prerequisites

Recommended base OS: current Ubuntu LTS or another supported 64-bit Linux distribution.

Install standard build and SSH tooling once:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git build-essential openssh-client openssl
```

Node and pnpm are installed by Actions workflows. Playwright and PostgreSQL integration dependencies are not required on this long-lived runner because those tests use disposable hosted runners.

## Register the runner

In GitHub open `Settings → Actions → Runners → New self-hosted runner`, choose Linux x64, and follow GitHub's current download and registration instructions.

Use a dedicated name and custom label, for example:

```bash
./config.sh \
  --url https://github.com/vudatdentist-ui/principles-council \
  --token <ONE_TIME_REGISTRATION_TOKEN> \
  --name principles-ci-01 \
  --labels principles-ci \
  --work _work \
  --unattended
```

Install the runner as a service under the dedicated `principles-ci` user and confirm it appears **Online / Idle** before relying on deployment orchestration.

## Production separation

Release verification completes on a disposable hosted runner first. The protected deployment job then uses SSH credentials stored in GitHub's production environment to deploy the exact `main` commit to the VPS. RAGFlow, DeepSeek, database and bootstrap credentials remain server/environment-owned and must never be copied into repository files or pull-request work directories.

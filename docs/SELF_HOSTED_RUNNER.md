# Self-hosted CI and deployment runner

Principles uses one dedicated GitHub Actions Linux x64 runner labeled `principles-ci`.

Required labels:

```text
self-hosted
linux
x64
principles-ci
```

## Security boundary

Run the Actions runner as a dedicated unprivileged Linux user such as `principles-ci`.

Do not run it as root. Do not grant passwordless sudo or Docker daemon access merely to support pull-request tests.

The Phase 1 audit confirmed the current runner has neither passwordless sudo nor Docker daemon access. That is intentional and should remain true.

Pull-request verification receives no production secrets. The protected production deployment job receives only its environment-scoped SSH/deployment secrets.

## Real PostgreSQL integration tests without privilege

Foundation, Playwright and release-verification jobs need real PostgreSQL behavior, but the CI user must stay unprivileged.

`scripts/ci-postgres.sh` solves this by downloading the exact pinned Linux x64 PostgreSQL 16 binary package:

```text
@embedded-postgres/linux-x64@16.14.0-beta.17
```

The script:

1. downloads the exact npm package version into `RUNNER_TEMP`;
2. hydrates the package's PostgreSQL symlinks;
3. initializes a disposable cluster as the `principles-ci` user with local trust auth;
4. binds only to `127.0.0.1` on a workflow-specific port;
5. creates the requested test database;
6. runs migrations/tests against that real server;
7. stops the server and removes its temporary files in an `if: always()` cleanup step.

The package is test infrastructure only. It is not bundled into the application and does not replace production PostgreSQL. Production uses the official `postgres:16-bookworm` image on the VPS private data network.

## Capacity

Run one `principles-ci` runner service unless concurrency is deliberately redesigned. A single runner process executes one self-hosted job at a time, which also prevents the disposable test databases from competing for CPU/RAM.

Current test ports are deliberately distinct:

```text
Foundation       55432
Playwright       55433
Release verify   55434
```

## Host prerequisites

Recommended host: supported 64-bit Linux with standard GNU userland and network access to GitHub/npm.

Install host prerequisites once:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git build-essential openssh-client openssl
```

Node 22 and pnpm are installed by Actions workflows. PostgreSQL does not need to be installed system-wide.

Playwright Chromium dependencies already exist on the current runner; the workflow installs the matching Chromium binary without requiring sudo.

## Runner registration

In GitHub open `Settings → Actions → Runners → New self-hosted runner`, choose Linux x64, and follow GitHub's current registration commands.

Example:

```bash
./config.sh \
  --url https://github.com/vudatdentist-ui/principles-council \
  --token <ONE_TIME_REGISTRATION_TOKEN> \
  --name principles-ci-01 \
  --labels principles-ci \
  --work _work \
  --unattended
```

Install the runner service under the dedicated `principles-ci` user and confirm it is **Online / Idle**.

## Production separation

The release-verification job runs the same unprivileged disposable PostgreSQL checks before deployment. Only after it passes does the protected deployment job SSH to the VPS and deploy the exact `main` commit.

RAGFlow, DeepSeek, production database and first-account bootstrap credentials remain server/environment-owned. Never copy them into repository files, pull-request work directories or CI logs.

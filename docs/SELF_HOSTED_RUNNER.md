# Self-hosted CI runner

This repository uses a dedicated GitHub Actions self-hosted Linux x64 runner for CI and production deployment jobs.

Required custom label:

```text
principles-ci
```

GitHub's default self-hosted labels must also be present:

```text
self-hosted
linux
x64
```

The workflows intentionally target all four labels:

```yaml
runs-on: [self-hosted, linux, x64, principles-ci]
```

## Capacity and concurrency

The expected runner size is 4 CPU / 8 GB RAM.

Run exactly one GitHub runner service with the `principles-ci` label. A single self-hosted runner process executes one Actions job at a time, which is the repository-wide hard limit that protects this host from concurrent build/test workloads. Workflow-level concurrency also cancels obsolete runs for the same ref where appropriate, and the only matrix job uses `max-parallel: 1`.

Do not register a second online runner with the `principles-ci` label unless the repository concurrency policy is intentionally changed.

## Security boundary

The CI runner must run as a dedicated unprivileged Linux user, for example `principles-ci`.

Do not run the Actions runner as root. Do not add the runner user to the `docker` group and do not give it passwordless sudo. Do not put `.env.production`, VPS private keys, database credentials, DeepSeek keys, RAGFlow keys, or other production secrets in the runner home/work directory.

Pull-request workflows use no production secrets. The production deployment workflow is not triggered by `pull_request`; it runs only for a push to `main`. Production SSH values are injected by GitHub only into the `deploy` job through the existing `production` environment/secrets.

If the runner is installed on the same physical VPS as production, keep the runner user separate from the application/deploy user and make production environment files unreadable to the runner user.

## Host prerequisites

Recommended base OS: current Ubuntu LTS or another supported 64-bit Linux distribution.

Install host packages as an administrator before configuring the runner:

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  git \
  build-essential \
  openssh-client \
  openssl
```

The workflows install their requested Node and pnpm versions with `actions/setup-node` and `pnpm/action-setup`, so global Node/pnpm are optional.

Playwright should not receive sudo privileges during CI. Install Chromium system dependencies once during provisioning. Use the Playwright version currently declared by this repository when running this command:

```bash
sudo npx -y playwright@1.61.1 install-deps chromium
```

The Playwright workflow then downloads/uses the Chromium browser without `--with-deps`.

## Create the dedicated runner user

Example:

```bash
sudo useradd --create-home --shell /bin/bash principles-ci
sudo install -d -o principles-ci -g principles-ci /opt/actions-runner
```

Do not grant this user sudo or Docker socket access.

## Register the runner with GitHub

In GitHub open:

`Settings → Actions → Runners → New self-hosted runner`

Choose **Linux** and **x64**. GitHub displays the current runner download URL, checksum, and a short-lived registration token. Use those exact values rather than copying an old token from documentation.

Download/extract the runner into `/opt/actions-runner` as the dedicated user, then configure it from that directory. The important configuration arguments are:

```bash
./config.sh \
  --url https://github.com/vudatdentist-ui/principles-council \
  --token <ONE_TIME_REGISTRATION_TOKEN> \
  --name principles-ci-01 \
  --labels principles-ci \
  --work _work \
  --unattended
```

GitHub automatically supplies the standard `self-hosted`, `linux`, and `x64` labels. Confirm that `principles-ci` is also shown before enabling CI.

Install/start the runner as a service using the service commands included with the downloaded runner package. Run the service as the dedicated `principles-ci` user, not root.

From the runner directory, the normal service lifecycle is:

```bash
sudo ./svc.sh install principles-ci
sudo ./svc.sh start
sudo ./svc.sh status
```

The administrative `svc.sh` command uses sudo only to manage the system service; the configured Actions jobs themselves run as `principles-ci` and should not have sudo privileges.

## First verification

Do not merge the CI migration PR until GitHub shows the runner as **Online / Idle** with these labels:

```text
self-hosted
linux
x64
principles-ci
```

Then run **Self-hosted runner diagnostics** from Actions, or let the diagnostics check on the migration PR run automatically.

The diagnostics job reports:

- hostname;
- kernel/OS and architecture;
- logical CPU count/model;
- RAM;
- host Node/npm/pnpm if already installed;
- the Node/npm/pnpm versions configured for CI.

A successful diagnostics run is the merge gate for the runner migration.

## Workflow behavior

### `lint.yml`

Runs on the self-hosted runner. The existing single Node matrix lane is explicitly limited to `max-parallel: 1`.

### `v2-foundation.yml`

Runs contracts, typecheck, scoped lint/tests, DB schema check, and build on the self-hosted runner. Obsolete runs for the same branch/PR are cancelled by workflow concurrency.

### `playwright.yml`

Runs the deterministic V2 harness and Chromium smoke tests on the self-hosted runner. Browser OS dependencies are provisioned once on the host; the workflow does not request sudo.

### `deploy-production.yml`

Both release verification and deployment target the self-hosted runner. The workflow has only a `push` trigger for `main`; it has no `pull_request` or manual deployment trigger. The deploy job also has an explicit `main` push condition before production secrets are referenced.

The existing Hostinger deployment target, Docker Compose configuration, RAGFlow setup, and production VPS are unchanged.

## Troubleshooting

### Job stays queued with `Waiting for a runner to pick up this job`

Check GitHub `Settings → Actions → Runners` and verify the runner is online and has all required labels. Label names should include `principles-ci` plus the default Linux/x64 labels.

On the runner host:

```bash
cd /opt/actions-runner
sudo ./svc.sh status
```

If stopped:

```bash
sudo ./svc.sh start
```

If needed, inspect the service logs with `journalctl` using the service name printed by `svc.sh status`.

### Runner is online but jobs do not match

Confirm the machine architecture is x86-64:

```bash
uname -m
```

Expected output is normally `x86_64`. Also confirm the GitHub runner page shows the custom `principles-ci` label.

### Playwright fails because Linux libraries are missing

Provision the dependencies once as an administrator:

```bash
sudo npx -y playwright@1.61.1 install-deps chromium
```

Then rerun the workflow. Do not solve this by granting the CI runner passwordless sudo.

### Out of memory or CPU contention

Confirm only one runner service carries the `principles-ci` label:

```bash
ps aux | grep Runner.Listener
free -h
nproc
```

Do not start multiple runner services on the 4 CPU / 8 GB host. Also check for unrelated workloads on the same machine.

### Disk usage grows

Inspect the runner work directory and Playwright/browser caches. GitHub Actions normally cleans job workspaces, but package/browser caches remain useful between jobs. Remove only stale caches while no Actions job is running.

### A PR appears to have production credentials

Stop the runner and investigate before continuing. PR workflows in this repository must not reference production secrets or have filesystem access to `.env.production`/deployment keys. Production secrets belong only to the `deploy` job, which runs after a `main` push.

## Removal or re-registration

Use the removal token generated by GitHub's runner settings page and the runner package's `config.sh remove` flow. Registration/removal tokens are short-lived; never store them in the repository.

# Self-hosted CI runner

This repository uses one dedicated GitHub Actions self-hosted Linux x64 runner for CI and production deployment jobs.

Required labels:

```text
self-hosted
linux
x64
principles-ci
```

All project workflows target:

```yaml
runs-on: [self-hosted, linux, x64, principles-ci]
```

## Capacity

Run one `principles-ci` runner service unless the repository concurrency policy is deliberately changed. A single runner process executes one job at a time and prevents build/test workloads from competing for the same host resources.

## Security boundary

Run the Actions runner as a dedicated unprivileged Linux user such as `principles-ci`.

Do not run the runner as root. Do not give the CI user passwordless sudo or production application credentials. Pull-request workflows receive no production secrets. The production deployment workflow runs only after a push to `main` and uses the protected GitHub `production` environment.

If CI and production share a physical VPS, keep the CI user separate from the deploy/application user and keep `.env.production` unreadable to CI.

## Host prerequisites

Recommended base OS: current Ubuntu LTS or another supported 64-bit Linux distribution.

Install standard build and SSH tooling once:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git build-essential openssh-client openssl
```

Node and pnpm are installed by Actions workflows. Provision Playwright Chromium system dependencies on the runner host once; CI downloads the matching browser binary without sudo.

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

Install the runner as a service under the dedicated `principles-ci` user and confirm it appears **Online / Idle** before relying on CI.

## Production separation

The runner builds and tests pull requests. Production deployment uses SSH credentials stored in the protected GitHub environment to deploy the exact `main` commit to the VPS. RAGFlow and DeepSeek credentials remain server/environment-owned and must never be copied into repository files or CI work directories.

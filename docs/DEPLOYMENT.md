# Production deployment

Every push to `main` (including a merged pull request) runs the verification job and, if it passes, uploads and deploys the exact commit to the Hostinger VPS. The workflow is `.github/workflows/deploy-production.yml`.

## GitHub configuration

Create a GitHub environment named `production` and add these secrets:

- `VPS_HOST`: VPS hostname or IP address.
- `VPS_USER`: SSH user with permission to run Docker Compose.
- `VPS_SSH_PORT`: SSH port; `22` is used when this secret is empty.
- `VPS_SSH_PRIVATE_KEY`: private key matching an authorized key on the VPS.
- `VPS_KNOWN_HOSTS`: output of `ssh-keyscan -p <port> <host>` after verifying the fingerprint.

Add this environment variable if the app should use another checkout path:

- `VPS_APP_DIR`: defaults to `/opt/principles-council` (the current Hostinger checkout).

The VPS must have Docker Engine and the Docker Compose plugin installed. Git is only needed for the optional manual helper. The `coolify` Docker network must exist because the production compose file attaches the web container to it.

## One-time VPS preparation

```bash
sudo install -d -m 0755 /opt
sudo install -d -m 0700 -o <deploy-user> -g <deploy-user> /home/<deploy-user>/.ssh
# Add the public key corresponding to VPS_SSH_PRIVATE_KEY to authorized_keys.
sudo docker network inspect coolify
```

The current server checkout is `/opt/principles-council`. Keep its `.env.production` server-only. It must contain the production app and RAGFlow connection settings; it is never copied from GitHub by the workflow.

After the first successful run, the container is updated with:

```bash
docker compose -f docker-compose.hostinger.yml ps
```

The workflow then checks `https://principles.me/`. RAGFlow remains a separate service and is not rebuilt or merged into the Next.js container. The GitHub token is never sent to the VPS.

For a manual deployment from the VPS, run:

```bash
bash scripts/deploy-hostinger.sh
```

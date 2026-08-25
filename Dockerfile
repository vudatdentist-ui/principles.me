FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack install --global pnpm@10.32.1 \
  && pnpm --version
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Start the runtime from a clean Node image rather than the build image. This
# intentionally excludes Corepack and pnpm from production containers.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# The runtime image is deliberately independent of pnpm/Corepack. The app is
# started with Next's standalone Node server and migrations are invoked with
# node directly, so the private migration network never needs registry access.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/scripts/smoke-production.mjs ./scripts/smoke-production.mjs
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=4s --start-period=8s --retries=12 CMD node -e "fetch('http://127.0.0.1:3000/api/health',{cache:'no-store'}).then(async r=>{const p=await r.json();process.exit(r.ok&&p.status==='ok'&&p.version===process.env.APP_VERSION?0:1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

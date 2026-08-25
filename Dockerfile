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

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# The runtime image already contains the pinned pnpm shim and cache. If a
# migration container is attached to an internal-only network, Corepack must
# fail fast instead of trying to download pnpm from the public registry.
ENV COREPACK_ENABLE_NETWORK=0
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/scripts/smoke-production.mjs ./scripts/smoke-production.mjs
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=4s --start-period=8s --retries=12 CMD node -e "fetch('http://127.0.0.1:3000/api/health',{cache:'no-store'}).then(async r=>{const p=await r.json();process.exit(r.ok&&p.status==='ok'&&p.version===process.env.APP_VERSION?0:1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]

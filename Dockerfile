# syntax=docker.io/docker/dockerfile:1

FROM oven/bun:1.3.14-slim AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=https://infrawatch.bafe.gov.ph
ARG NEXT_PUBLIC_BASE_URL=https://infrawatch.bafe.gov.ph
ARG NEXT_PUBLIC_MINIO_ENDPOINT=storage.bafe.online
ARG NEXT_PUBLIC_MINIO_BUCKET=infra-watch
ARG NEXT_PUBLIC_MINIO_USE_SSL=true

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_MINIO_ENDPOINT=${NEXT_PUBLIC_MINIO_ENDPOINT} \
    NEXT_PUBLIC_MINIO_BUCKET=${NEXT_PUBLIC_MINIO_BUCKET} \
    NEXT_PUBLIC_MINIO_USE_SSL=${NEXT_PUBLIC_MINIO_USE_SSL}

RUN DATABASE_URL=postgresql://build:unused@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET="$(bun -e 'console.log(crypto.randomUUID() + crypto.randomUUID())')" \
    BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL} \
    bun run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system nodejs \
    && useradd --system --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/bun.lock ./bun.lock
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/auth-schema.ts ./auth-schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/docker/start.sh ./start.sh

RUN chmod +x /app/start.sh
USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["/app/start.sh"]

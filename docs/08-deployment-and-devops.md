# Deployment & DevOps

> Deployment specifications, multi-container Docker configuration, and production environment rules for INFRA Watch.

---

## 1. Local Development Stack

For local development, we use `docker-compose` to run the supportive database, cache, and object storage services, while running the Next.js server locally via Bun.

### Services configuration (`docker-compose.yml`)
1. **PostgreSQL 18**: Equipped with the `postgis/postgis:3-alpine` extension for geolocation queries.
2. **Redis 7**: Caching layer for API calls, session tokens, and rate limits.
3. **MinIO**: Local S3-compatible object storage emulator for handling citizen uploads.

---

## 2. Production Docker Architecture

In production, the entire application runs inside Docker containers orchestrated on a secure VPS server.

```
                  [ HTTPS Client Traffic ]
                             │
                             ▼
                    [ Nginx Reverse Proxy ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
      [ App Container ]             [ Geoserver Container ]
      (Next.js 15 + Bun)            (GIS Map Layers)
            │
            ├─► [ Redis Cache ] (Upstash or Managed Redis)
            │
            └─► [ PostgreSQL 18 + PostGIS ] (Persistent Volume)
```

### 2.1 Next.js App Dockerfile
We utilize a multi-stage Docker build with the Bun runtime to keep production images tiny and highly optimized.

```dockerfile
# Stage 1: Build
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Stage 2: Runner
FROM oven/bun:1.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", "start"]
```

---

## 3. Database Backup Schedule

To prevent data loss, a cron job on the production host triggers a database backup script every night at 2:00 AM.
- **Tool**: `pg_dump` targeting the Postgres container.
- **Target Folder**: `/var/backups/infra-watch/db/`
- **Retention Policy**: Keeps backups for 30 days. Files older than 30 days are automatically purged.
- **Offsite backup**: Encrypted backups are zipped and uploaded to a secure BAFE remote storage bucket.

---

## 4. Monitoring & Error Tracking

### 4.1 Sentry Integration
Sentry monitors error logs and UI crashes in real-time.
- **Frontend Tracking**: Catches hydration mismatches, JavaScript exceptions, and layout crashes.
- **Backend Tracking**: Catches database timeouts, failed ABEMIS sync attempts, and unauthorized API calls.

### 4.2 Upstash Workflows
Used for robust job processing:
- Runs incremental data syncs on schedule.
- Handles email notification queues with automatic retry rules in case the email API fails.

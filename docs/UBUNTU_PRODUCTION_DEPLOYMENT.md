# InfraWatch Ubuntu production runbook

Use this runbook to deploy InfraWatch at `https://infrawatch.bafe.gov.ph` on the Ubuntu host `infra-watch@192.168.2.236`.

## Prerequisites

- DNS for `infrawatch.bafe.gov.ph` points to the public address serving the Ubuntu host.
- Docker Engine and Docker Compose v2 are installed.
- The existing `fmr-watch-network` Docker network can reach `postgres18`.
- The production MinIO credentials can create or access the `infra-watch` bucket.
- Ports 80 and 443 reach Nginx. The app port `3101` remains bound to loopback only.

## 1. Prepare PostgreSQL

Generate a database password, then create a dedicated role and database from a PostgreSQL administrator session:

```bash
openssl rand -hex 32
docker exec -it postgres18 psql -U postgres
```

In `psql`, substitute the generated password:

```sql
CREATE ROLE infra_watch LOGIN PASSWORD 'REPLACE_WITH_GENERATED_PASSWORD';
CREATE DATABASE infra_watch OWNER infra_watch;
\connect infra_watch
CREATE EXTENSION IF NOT EXISTS postgis;
```

Put the same password in `.env.production` as part of `DATABASE_URL`. Do not commit that file.

## 2. Copy and configure the application

```bash
sudo mkdir -p /opt/infra-watch
sudo chown "$USER":"$USER" /opt/infra-watch
git clone https://github.com/BAFE-PKMDD/infra-watch.git /opt/infra-watch
cd /opt/infra-watch
git switch branch-staging
cp .env.production.example .env.production
chmod 600 .env.production
```

Populate `.env.production`. A local InfraWatch file derived from FMR Watch is already prepared for transfer. Confirm these values before starting:

- `DATABASE_URL` uses the new `infra_watch` role and database.
- `BETTER_AUTH_SECRET` is unique to InfraWatch.
- All application/auth URLs use `https://infrawatch.bafe.gov.ph`.
- MinIO uses the shared production endpoint and the `infra-watch` bucket.
- `DOCKER_NETWORK` matches the network containing `postgres18`.
- `AI_PROVIDER=google`, `AI_MODEL=gemini-flash-latest`, and `GEMINI_API_KEY`
  contains the rotated production credential.
- `CHAT_RATE_LIMIT_SECRET` is a unique high-entropy production secret.
- `CHAT_TRUST_PROXY=true`. This is required for public anonymous chat and is safe
  only with the checked-in Nginx configuration, which replaces client-supplied
  forwarding headers with the canonical client IP.

For an existing InfraWatch database, take a verified backup and inspect
`drizzle.__drizzle_migrations` before the first deployment. If application tables
exist but the journal is absent, set `BASELINE_EXISTING_DATABASE=true` for one
deployment only. Startup verifies tables, columns, defaults, keys, constraints,
and indexes against the committed Drizzle snapshots before recording a baseline.
Return the setting to `false` immediately after migrations succeed.

For Google sign-in, register this callback in the Google Cloud OAuth client:

```text
https://infrawatch.bafe.gov.ph/api/auth/callback/google
```

## 3. Start InfraWatch

```bash
cd /opt/infra-watch
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 app
```

The startup script waits for PostgreSQL and applies committed Drizzle migrations before starting Next.js.

## 4. Configure Nginx and HTTPS

Copy `deploy/nginx/infrawatch.bafe.gov.ph.conf` to `/etc/nginx/sites-available/`. Obtain the certificate before enabling the TLS server block if one does not exist yet.

```bash
sudo mkdir -p /var/www/letsencrypt
sudo certbot certonly --webroot -w /var/www/letsencrypt -d infrawatch.bafe.gov.ph
sudo ln -s /etc/nginx/sites-available/infrawatch.bafe.gov.ph.conf /etc/nginx/sites-enabled/infrawatch.bafe.gov.ph.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Verify

```bash
curl -I http://127.0.0.1:3101
curl -I https://infrawatch.bafe.gov.ph
docker inspect --format '{{json .State.Health}}' infra-watch
```

Check sign-in, project browsing, feedback moderation, a MinIO upload, and one ABEMIS synchronization.
Also send one anonymous chatbot request through the public HTTPS URL. A `503`
response stating that anonymous chat is unavailable means `CHAT_TRUST_PROXY` or
the trusted Nginx forwarding headers are not configured correctly.

## Updates

```bash
cd /opt/infra-watch
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker image prune -f
```

## Rollback

Before updating, record the current commit with `git rev-parse HEAD`. To roll back:

```bash
git switch --detach PREVIOUS_COMMIT_SHA
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Database migrations must be assessed separately before rolling back application code. Restore PostgreSQL from a tested backup if a migration is not backward-compatible.

## Backup

```bash
mkdir -p /opt/infra-watch/backups
docker exec postgres18 pg_dump -U infra_watch -d infra_watch -Fc > \
  "/opt/infra-watch/backups/infra-watch-$(date +%Y%m%d-%H%M%S).dump"
```

Back up the `infra-watch` MinIO bucket using the organization’s existing MinIO backup procedure.

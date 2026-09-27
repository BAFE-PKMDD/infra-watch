# InfraWatch Current-System Documentation

**Audit date:** 2026-09-20
**Audited tree:** current working tree on `main` at `91cdcf7`
**Purpose:** describe behavior supported by executable repository code, including current uncommitted and untracked feature work.

## Status of this documentation

This directory is the current-code audit. Older numbered files under `docs/` contain useful design history, but some statements no longer match the application. Examples of known documentation drift include references to Next.js 15, a `super_admin` role, Redis/Upstash, Sentry, GeoServer, Resend, and routes or services not present in the executable configuration.

Use the following status labels throughout these documents:

- **Implemented:** backed by current application code and persistent data where applicable.
- **Configuration-dependent:** implemented but unavailable unless its environment/service dependency is enabled.
- **Prototype:** deliberately non-production, synthetic, local-only, or incomplete.
- **Proposed:** recommendation only; not an existing capability.
- **Gap:** a missing control or behavior confirmed by source inspection.

## Documents

1. [Feature catalog](./feature-catalog.md) — public, citizen, staff, administrative, API, and cross-cutting functions.
2. [Route and API inventory](./route-and-api-inventory.md) — exact inventory of all 44 page routes, 42 API route files, and supporting domain services.
3. [Workflows and state transitions](./workflows-and-state-transitions.md) — end-to-end processes, actors, inputs, outputs, and state changes.
4. [Enhancement assessment](./enhancement-assessment.md) — prioritized security, integrity, privacy, reliability, and usability improvements.
5. [Audience activity and demographic analytics](./audience-activity-and-demographic-analytics.md) — current analytics boundary and a privacy-safe proposed design for visits, downloads, age bands, gender, and audience type.

## System summary

InfraWatch is a Next.js 16/React 19 application running with Bun. It uses PostgreSQL through Drizzle ORM, Better Auth for authentication, an ABEMIS-synchronized project read model, MinIO-compatible object storage, and optional AI and voice services. It is packaged as a standalone Docker application and expects its database, object storage, reverse proxy, and optional AI sidecars to be supplied externally.

Primary capability groups:

- Public infrastructure project directory, record pages, maps, and portfolio analytics
- Public citizen feed, project feedback, E-Report submission, and public issue activity
- Authenticated citizen issue, feedback, notification, and profile views
- Administrative project monitoring, managerial analytics, feedback moderation, issue response, SLA reports, ABEMIS synchronization, data-quality review, audit logs, knowledge-base management, live-video management, and user management
- Public project-grounded AI chat and optional admin managerial/voice assistance
- Scheduled synchronization, retention cleanup, feedback acknowledgment, and SLA reminders
- Development-only SMS grievance review prototype

## Source-of-truth hierarchy

When files disagree, use this order:

1. Server-side authorization and mutation code
2. Database schema and migrations
3. Route handlers and server actions
4. UI components and navigation
5. Tests
6. This audit
7. Older planning documents

Important source paths include:

- `app/` — page and API routes
- `actions/` — server queries and mutations
- `lib/db/schema.ts` and `auth-schema.ts` — application and authentication data models
- `lib/permissions.ts`, `lib/session.ts`, and `lib/scope.ts` — role and scope enforcement
- `lib/abemis/` — source integration and synchronization
- `lib/analytics/` — managerial calculations, snapshots, drillthrough, and AI support
- `lib/scheduler.ts` and `instrumentation.ts` — process-local recurring jobs
- `Dockerfile`, `docker/start.sh`, and `docker-compose.production.yml` — deployment behavior

## Important interpretation boundaries

- Existing “analytics” describe infrastructure projects and operational response times. The repository does **not** currently implement website visitor/download analytics or consented age/gender analytics.
- The Data Quality module is recommendation/export-only. It does not clean, archive, or delete project records.
- The SMS grievance feature loads real messages from the SMS grievance line's public API server-side (falling back to a synthetic sample set if that feed is unreachable); review decisions on top of those messages stay browser-local only, and the whole feature is disabled in production.
- Public map points are limited to projects or evidence with usable source-backed coordinates; missing coordinates are not invented.
- A feedback marked “anonymous” remains associated internally with the authenticated submitting account; its identity is hidden from public presentation, not removed from authorized staff data.
- Application audit/session tables currently contain IP-address and user-agent fields. These are security/administration records, not an approved source for demographic inference.

## Audit method and limits

The audit inventoried all current App Router pages and API route files, reviewed server actions and exported domain services, inspected application/auth schemas, traced authorization and moderator scope logic, and reviewed runtime/deployment configuration. Focused verification from the audit passed TypeScript and selected auth/sync/notification/issue/voice/managerial-AI tests.

This documentation does not claim that every external production dependency is healthy or configured. Runtime availability still depends on the production database, ABEMIS, MinIO, configured AI provider, local embedding service, SMTP/SMS settings, and optional voice sidecars.

# Project Roadmap & Implementation Plan

> Phased development roadmap, testing, and deployment milestones for the launch of INFRA Watch.

---

## Phase 1: Foundation & Project Setup
*Timeline: Week 1*

- [ ] Initialize Next.js 15, TypeScript, and Bun configuration.
- [ ] Set up Tailwind CSS configurations and create `globals.css` design tokens.
- [ ] Install Shadcn components (`button`, `card`, `table`, `dialog`, `toast`).
- [ ] Establish directory structure (`actions`, `components`, `lib`, `hooks`, `types`, `schemas`).
- [ ] Configure ESLint and Prettier.

---

## Phase 2: Database & Authentication Setup
*Timeline: Week 2*

- [ ] Write PostgreSQL schemas using Drizzle ORM (merging custom schemas and Better Auth tables).
- [ ] Configure PostGIS extensions in migration files.
- [ ] Generate and run database migrations using `drizzle-kit`.
- [ ] Configure Better Auth routes, session rules, and admin plugins.
- [ ] Implement user seeding scripts (`seed.ts` for default administrator).
- [ ] Integrate Upstash Redis client for caching and rate limiting.

---

## Phase 3: ABEMIS API Integration & Caching
*Timeline: Week 3*

- [ ] Implement the ABEMIS API client (`lib/abemis/client.ts`) with custom filters for AMEFIP & INS.
- [ ] Write transform utilities to map ABEMIS properties to internal database structures.
- [ ] Build the Next.js API Proxy (`/api/projects`) with Zod query validation.
- [ ] Connect Redis cache handler (revalidate logic set to 1 hour for production).
- [ ] Develop background synchronization workflows (cron-scheduled and manual trigger options).

---

## Phase 4: Public Portal UI
*Timeline: Weeks 4–5*

- [ ] Build the landing page with modern cards, stats, and project showcases.
- [ ] Design the interactive GIS Map component with marker clusters and GeoServer layers.
- [ ] Build the project catalog with search, categorization, and sorting logic.
- [ ] Build the Project Details view (metadata grids, timelines, files, photo galleries).
- [ ] Configure translations for Tetum, English, and Portuguese via `next-intl`.

---

## Phase 5: Citizen Feedback & Issues Module
*Timeline: Week 6*

- [ ] Design feedback forms with star ratings and file uploads.
- [ ] Implement client-side GPS coordinates verification for uploaded pictures.
- [ ] Build the Issue Reporting form.
- [ ] Program Server Actions for uploading files to S3/MinIO with security validation.
- [ ] Connect the notification engine (sending emails to moderators and in-app alerts to citizens).

---

## Phase 6: Administration Dashboard & Scoping
*Timeline: Week 7*

- [ ] Build the admin layout and analytics board (Sector charts, physical vs financial charts).
- [ ] Design moderation boards for approving feedback and replying to reported issues.
- [ ] Enforce the `assigned_municipality` scoping checks in server actions and queries.
- [ ] Set up user management pages for Super Admins.
- [ ] Integrate Google Analytics and the GDPR cookie consent banner.

---

## Phase 7: Deployment & QA
*Timeline: Week 8*

- [ ] Configure production-ready Dockerfile and docker-compose files.
- [ ] Write database backup scripts.
- [ ] Connect Sentry error reporting.
- [ ] Execute security audits on public and protected API routes.
- [ ] Conduct end-to-end user acceptance testing (UAT).
- [ ] Go live.

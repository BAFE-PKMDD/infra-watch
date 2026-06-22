# INFRA Watch — Overview

> **Infrastructure Network for Fair Reporting and Accountability**
> A transparency portal for AMEFIP and INS infrastructure projects sourced from ABEMIS (2021–2026)

---

## 1. What is INFRA Watch?

INFRA Watch is a public transparency and accountability portal that enables citizens to view, track, and provide feedback on infrastructure projects from various government agencies. BAFE is the launching agency, providing data on **AMEFIP** (Agricultural Machinery, Equipment, Facilities, and Infrastructures Program) and **INS** (Irrigation Network Services) projects recorded in **ABEMIS** from fiscal years **2021 to 2026**. The system's architecture is fully multi-agency ready, allowing other government agencies to integrate and display their infrastructure projects in the future.

It mirrors the architecture and user-experience patterns established by **FMR Watch** but is scoped to general infrastructure data. Citizens can browse projects, submit feedback, report issues, and access analytics — all through a clean, accessible, bilingual interface.

---

## 2. Relationship to FMR Watch

| Aspect | FMR Watch | INFRA Watch |
| :--- | :--- | :--- |
| **Data Source** | FMR projects from ABEMIS | AMEFIP & INS projects from ABEMIS |
| **Year Range** | Varies | 2021–2026 |
| **Core Purpose** | Transparency & citizen feedback on FMR spending | Transparency & citizen feedback on infrastructure |
| **Tech Stack** | Next.js 15, Drizzle ORM, PostgreSQL, Redis, Better Auth | Same (cloned architecture) |
| **Deployment** | Docker on production server | Docker on production server |
| **ABEMIS Integration** | `/api/projects` proxy with caching | Same proxy pattern, different endpoints/filters |

### What We Inherit from FMR Watch

- Full authentication system (Better Auth with email/password + admin roles)
- Role-based access control (Super Admin → Admin → User/Citizen)
- Feedback & comment system with moderation workflows
- Notification system (in-app + email via Resend)
- Analytics dashboard with charts
- Redis caching layer for ABEMIS API responses
- Cookie consent & GDPR compliance
- i18n (Tetum / English / Portuguese)
- Docker deployment pipeline
- Sentry error monitoring & instrumentation
- Upstash workflow orchestration

### What Changes for INFRA Watch

- **Data domain**: AMEFIP and INS categories instead of FMR
- **ABEMIS API filters**: Different `activityBudgetCategory` values
- **Project schema fields**: Infrastructure-specific metadata (sector, implementing agency, physical progress, geographic coordinates)
- **Dashboard metrics**: Infrastructure KPIs (completion rate, geographic distribution, sector breakdown)
- **Branding & theming**: Distinct color palette, logo, and identity
- **Landing page**: Infrastructure-focused hero, stats, and project showcase

---

## 3. Key Stakeholders

| Stakeholder | Role |
| :--- | :--- |
| **BAFE** | Primary launching agency, data provider (AMEFIP & INS) |
| **Other Agencies** | Future data contributors (e.g., DPWH, local government units) |
| **Citizens** | Browse projects, submit feedback, report issues |
| **Moderators** | Scoped users who moderate content and resolve issues in their assigned municipality or agency |
| **Super Admins (BAFE / System Owners)** | Full system administration, user management, analytics |
| **ABEMIS** | External data source for project information |

---

## 4. Documentation Index

| Document | Description |
| :--- | :--- |
| [01-system-architecture.md](./01-system-architecture.md) | Technical architecture, tech stack, and infrastructure |
| [02-database-schema.md](./02-database-schema.md) | Database design, tables, relationships, and migrations |
| [03-abemis-integration.md](./03-abemis-integration.md) | ABEMIS API integration, proxy layer, and caching strategy |
| [04-authentication-and-roles.md](./04-authentication-and-roles.md) | Auth system, roles, permissions, and session management |
| [05-features-and-modules.md](./05-features-and-modules.md) | Feature breakdown — feedback, reporting, notifications, analytics |
| [06-ui-ux-design.md](./06-ui-ux-design.md) | UI/UX design system, page layouts, and component library |
| [07-api-routes.md](./07-api-routes.md) | API endpoint design, request/response schemas |
| [08-deployment-and-devops.md](./08-deployment-and-devops.md) | Docker, CI/CD, environment configuration |
| [09-security.md](./09-security.md) | Security measures, audit results, and best practices |
| [10-project-roadmap.md](./10-project-roadmap.md) | Phased development roadmap and milestones |
| [11-migration-guide.md](./11-migration-guide.md) | Codebase migration and refactoring steps |

---

## 5. Quick Start (Development)

```bash
# Clone the repository
git clone <repo-url> infra-watch
cd infra-watch

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database, Redis, ABEMIS, and email credentials

# Run database migrations
bun run db:migrate

# Seed initial admin user
bun run db:seed

# Start development server
bun run dev
```

---

## 6. Glossary

| Term | Definition |
| :--- | :--- |
| **ABEMIS** | Government budget/project management system (external API) |
| **AMEFIP** | Agricultural Machinery, Equipment, Facilities, and Infrastructures Program |
| **INS** | Irrigation Network Services |
| **FMR** | Fundu Munisipal Regulamentar (Municipal Regulatory Fund) |
| **BAFE** | Government oversight body |
| **ABC** | Activity Budget Category (ABEMIS classification) |
| **Scoping Rule** | Rule that restricts which projects/data a user can access based on their assigned municipality |

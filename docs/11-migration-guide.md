# Codebase Migration & Refactoring Guide

> Step-by-step technical guide for migrating the FMR Watch codebase to the newly created INFRA Watch project.

---

## 1. Codebase Initialization & File Sync

Because INFRA Watch is a brand new Next.js project, we need to copy over the mature modular codebase from FMR Watch and refactor it.

### Step 1.1: Dependency Syncing
Copy the `dependencies`, `devDependencies`, and `scripts` blocks from `/Users/rnnchy/Repo/fmr-watch/fmr-watch/package.json` to `/Users/rnnchy/Repo/fmr-watch/infra-watch/package.json`.
- Execute `bun install` inside `/Users/rnnchy/Repo/fmr-watch/infra-watch` to synchronize all packages (e.g., Better Auth, Drizzle ORM, Leaflet, Framer Motion, Sentry, Upstash Workflows).

### Step 1.2: Configuration Copying
Copy the following root configuration files from `fmr-watch` to `infra-watch`:
- `components.json` (shadcn setup)
- `drizzle.config.ts` (database builder config)
- `tsconfig.json` (TypeScript paths configuration)
- `next.config.ts` (Next.js Standalone build and CSP header config)
- `instrumentation.ts` (cron scheduler activation)
- `proxy.ts` (Better Auth middleware router)
- `.env.example` (environment template)

### Step 1.3: Module Directories Copying
Copy the following folders recursively from `fmr-watch` to `infra-watch`:
- `lib/` (database, auth, redis, abemis clients)
- `types/` (TypeScript typings)
- `validator/` (Zod validation schemas)
- `actions/` (Server Actions logic)
- `hooks/` (Custom React hooks)
- `providers/` (Query, Auth, and Theme providers)
- `components/` (UI, admin, public, analytics layouts)
- `app/` (Router tree routes)
- `i18n/` (translations JSON files)
- `emails/` (Resend template components)
- `workflows/` (Upstash sync tasks)
- `scripts/` (database seeders)

---

## 2. Refactoring Checklist

Once the files are copied, follow this sequence of edits to convert the domain from FMR to INFRA:

### Step 2.1: Global Find-and-Replace
- Replace all occurrences of `"FMR Watch"` with `"INFRA Watch"`.
- Replace all occurrences of `"fmr-watch"` with `"infra-watch"`.

### Step 2.2: Schema Customization (`lib/db/schema.ts`)
- Modify the `user` table to add the `assigned_agency` column.
- Update the `projects`, `sync_logs`, and `regional_statistics` tables to expand `source_agency` character limits/definitions, facilitating multi-agency scoping (`'BAFE-AMEFIP'`, `'BAFE-INS'`, etc.).
- Run the migration commands:
  ```bash
  bunx drizzle-kit generate
  bun run db:migrate
  ```

### Step 2.3: API Integration Refactor (`lib/abemis/client.ts`)
- Change the target URL inside the ABEMIS client to:
  ```http
  GET {{ABEMIS_BASE_URL}}/api/infra-amefip-list
  ```
- Update the transformer (`lib/abemis/transform.ts`) to map verified JSON keys:
  - `project_title` ──► `name`
  - `project_type` ──► `sector`
  - `geotag` ──► `metadata.geotag`
  - `proposalDocuments` ──► `metadata.documents`
- Update the program code parser:
  - Mapped to `'BAFE-AMEFIP'` if `prexc_program === 'AMEFIP'`
  - Mapped to `'BAFE-INS'` if `sub_program === 'Irrigation Network Services'`

### Step 2.4: Administrative Scoping Updates
- Update permissions checking utilities in `lib/permissions.ts` and scoping checks in `lib/scope.ts` to enforce `assigned_agency` along with `assigned_municipality`.

---

## 3. Environment & Local Run

- Copy `.env.example` to `.env` inside `infra-watch`.
- Configure the verified credentials:
  ```env
  DATABASE_URL=postgresql://user:password@localhost:5432/infra_watch
  ABEMIS_BASE_URL=http://localhost:8080
  ABEMIS_API_KEY=ifCLaZ-KRPeASuViMvY44EtFERTtr92Y2CS98R52A3KtqtxbKIOqoY34Yot76Hg5
  ```
- Seed the database:
  ```bash
  bun run db:seed
  ```
- Launch the development server:
  ```bash
  bun run dev
  ```

# System Architecture

> Technical architecture for INFRA Watch — inherited from FMR Watch with infrastructure-domain adaptations.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INFRA Watch System                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Browser  │◄──►│  Next.js 15  │◄──►│  PostgreSQL (Drizzle)   │  │
│  │  (Client) │    │  App Router  │    │  - Auth tables           │  │
│  └──────────┘    │  (Server)    │    │  - Feedback tables        │  │
│                   │              │    │  - Notification tables    │  │
│                   │  ┌────────┐  │    │  - Analytics tables       │  │
│                   │  │ Better │  │    └──────────────────────────┘  │
│                   │  │  Auth  │  │                                   │
│                   │  └────────┘  │    ┌──────────────────────────┐  │
│                   │              │◄──►│  Redis (Upstash)          │  │
│                   │  ┌────────┐  │    │  - ABEMIS response cache  │  │
│                   │  │ Proxy  │  │    │  - Session cache           │  │
│                   │  │ Layer  │──┼──► │  - Rate limiting           │  │
│                   │  └────────┘  │    └──────────────────────────┘  │
│                   └──────┬───────┘                                   │
│                          │                                           │
│                          ▼                                           │
│                   ┌──────────────┐    ┌──────────────────────────┐  │
│                   │  ABEMIS API  │    │  Resend (Email)           │  │
│                   │  (External)  │    │  - Notifications          │  │
│                   │  AMEFIP/INS  │    │  - Feedback alerts        │  │
│                   │  Data Source  │    └──────────────────────────┘  │
│                   └──────────────┘                                   │
│                                       ┌──────────────────────────┐  │
│                                       │  Sentry (Monitoring)      │  │
│                                       │  - Error tracking          │  │
│                                       │  - Performance monitoring  │  │
│                                       └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Core Framework

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Next.js** | 15.x | Full-stack React framework (App Router) |
| **React** | 19.x | UI component library |
| **TypeScript** | 5.x | Type-safe development |
| **Bun** | Latest | Package manager & runtime |

### Database & ORM

| Technology | Purpose |
| :--- | :--- |
| **PostgreSQL** | Primary relational database |
| **Drizzle ORM** | Type-safe SQL query builder & migrations |
| **drizzle-kit** | Migration generation and management |

### Authentication

| Technology | Purpose |
| :--- | :--- |
| **Better Auth** | Authentication framework (email/password, sessions) |
| **better-auth/plugins** | Admin plugin, username plugin |

### Caching & Performance

| Technology | Purpose |
| :--- | :--- |
| **Redis (Upstash)** | Response caching, rate limiting, session store |
| **@upstash/redis** | Redis client for serverless |
| **@upstash/workflow** | Background job orchestration |

### UI Components & Styling

| Technology | Purpose |
| :--- | :--- |
| **shadcn/ui** | Component library (Radix primitives + Tailwind) |
| **Tailwind CSS** | Utility-first CSS framework |
| **Recharts** | Chart/data visualization library |
| **Lucide React** | Icon library |
| **Framer Motion** | Animation library |
| **Embla Carousel** | Carousel component |
| **Sonner** | Toast notifications |

### Email & Notifications

| Technology | Purpose |
| :--- | :--- |
| **Resend** | Transactional email service |
| **React Email** | Email template components |

### Monitoring & Analytics

| Technology | Purpose |
| :--- | :--- |
| **Sentry** | Error tracking & performance monitoring |
| **@sentry/nextjs** | Next.js-specific Sentry integration |

### Validation

| Technology | Purpose |
| :--- | :--- |
| **Zod** | Runtime schema validation |

### Internationalization

| Technology | Purpose |
| :--- | :--- |
| **next-intl** | i18n framework for Next.js |

---

## 3. Directory Structure

```
infra-watch/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes (no auth required)
│   │   ├── page.tsx              # Landing page
│   │   ├── projects/             # Public project listing & detail
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── about/                # About INFRA Watch
│   │   └── contact/              # Contact page
│   ├── (auth)/                   # Auth routes
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── dashboard/            # Dashboard overview
│   │   ├── projects/             # Admin project management
│   │   ├── feedback/             # Feedback management
│   │   ├── reports/              # Issue reports management
│   │   ├── analytics/            # Analytics & charts
│   │   ├── notifications/        # Notification center
│   │   ├── users/                # User management (super admin)
│   │   └── settings/             # System settings
│   ├── api/                      # API routes
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── projects/             # ABEMIS proxy endpoints
│   │   ├── feedback/             # Feedback CRUD
│   │   ├── notifications/        # Notification endpoints
│   │   └── analytics/            # Analytics data endpoints
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Header, footer, sidebar, nav
│   ├── projects/                 # Project cards, tables, detail views
│   ├── feedback/                 # Feedback forms, lists, detail sheets
│   ├── reports/                  # Issue reporting components
│   ├── analytics/                # Chart components, stat cards
│   ├── notifications/            # Notification bell, list, preferences
│   ├── auth/                     # Sign-in/up forms, guards
│   └── shared/                   # Shared/common components
├── actions/                      # Server actions
│   ├── feedback.ts               # Feedback CRUD actions
│   ├── notifications.ts          # Notification actions
│   ├── projects.ts               # Project data actions
│   ├── analytics.ts              # Analytics data actions
│   └── users.ts                  # User management actions
├── lib/                          # Utility libraries
│   ├── db.ts                     # Database connection (Drizzle)
│   ├── auth.ts                   # Better Auth configuration
│   ├── auth-client.ts            # Client-side auth helpers
│   ├── redis.ts                  # Redis client setup
│   ├── resend.ts                 # Email client setup
│   ├── utils.ts                  # General utilities
│   └── abemis.ts                 # ABEMIS API client
├── types/                        # TypeScript type definitions
│   ├── projects.ts               # Project-related types
│   ├── feedback.ts               # Feedback types
│   ├── notifications.ts          # Notification types
│   ├── analytics.ts              # Analytics types
│   └── auth.ts                   # Auth & user types
├── constants/                    # Application constants
│   ├── projects.ts               # Project categories, statuses
│   ├── municipalities.ts         # Municipality list
│   ├── navigation.ts             # Nav items
│   └── config.ts                 # App configuration
├── schemas/                      # Zod validation schemas
│   ├── feedback.ts
│   ├── auth.ts
│   └── projects.ts
├── hooks/                        # Custom React hooks
│   ├── use-projects.ts
│   ├── use-feedback.ts
│   └── use-notifications.ts
├── providers/                    # React context providers
│   ├── query-provider.tsx        # TanStack Query
│   ├── theme-provider.tsx        # Theme (dark/light)
│   └── auth-provider.tsx         # Auth session
├── i18n/                         # Internationalization
│   ├── config.ts
│   └── messages/
│       ├── en.json
│       ├── pt.json
│       └── tet.json
├── emails/                       # Email templates (React Email)
│   ├── feedback-notification.tsx
│   └── welcome.tsx
├── workflows/                    # Upstash background workflows
│   └── notification-workflow.ts
├── drizzle/                      # Database migrations
│   └── migrations/
├── public/                       # Static assets
│   ├── images/
│   └── icons/
├── docs/                         # Documentation (this folder)
├── drizzle.config.ts             # Drizzle configuration
├── next.config.ts                # Next.js configuration
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── .dockerignore
```

---

## 4. Data Flow

### 4.1 Project Data Flow (Read)

```
Citizen Browser
    │
    ▼
Next.js Server (App Router)
    │
    ├─► Check Redis Cache
    │     │
    │     ├─ HIT → Return cached response
    │     │
    │     └─ MISS ─► ABEMIS API
    │                   │
    │                   ▼
    │              Fetch AMEFIP/INS projects
    │              (filtered by ABC category + year range)
    │                   │
    │                   ▼
    │              Transform & normalize response
    │                   │
    │                   ▼
    │              Store in Redis (TTL: configurable)
    │                   │
    │                   ▼
    │              Return to client
    │
    ▼
Render project cards / table / detail view
```

### 4.2 Feedback Submission Flow (Write)

```
Citizen fills feedback form
    │
    ▼
Client-side Zod validation
    │
    ▼
Server Action (actions/feedback.ts)
    │
    ├─► Authenticate session (Better Auth)
    │
    ├─► Validate with Zod schema
    │
    ├─► Insert into PostgreSQL (feedback table)
    │
    ├─► Trigger Upstash Workflow
    │     │
    │     ├─► Send email notification to admins (Resend)
    │     │
    │     └─► Create in-app notification record
    │
    └─► Return success response
```

### 4.3 Admin Moderation Flow

```
Admin opens dashboard
    │
    ▼
Fetch pending feedback (scoped by municipality)
    │
    ▼
Review feedback detail (sheet/modal)
    │
    ├─► Approve → Update status, notify citizen
    ├─► Reject → Update status, notify citizen with reason
    └─► Flag → Mark for super admin review
```

---

## 5. Caching Strategy

| Cache Target | TTL | Invalidation |
| :--- | :--- | :--- |
| ABEMIS project list | 1 hour | Manual purge via admin |
| ABEMIS project detail | 1 hour | Manual purge via admin |
| Municipality list | 24 hours | On deployment |
| Analytics aggregates | 15 minutes | On new feedback/report |
| User session | 7 days | On logout/password change |

---

## 6. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/infra_watch

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# ABEMIS API
ABEMIS_API_BASE_URL=https://abemis.gov.tl/api
ABEMIS_API_USERNAME=...
ABEMIS_API_PASSWORD=...

# Email
RESEND_API_KEY=...
EMAIL_FROM=noreply@infrawatch.gov.tl

# Sentry
SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=INFRA Watch

# Upstash Workflow
UPSTASH_WORKFLOW_URL=...
QSTASH_TOKEN=...
```

---

## 7. Key Architectural Decisions

### 7.1 Proxy Pattern for ABEMIS

All ABEMIS API calls go through a Next.js proxy layer (`proxy.ts`). This:
- Hides ABEMIS credentials from the client
- Adds Redis caching
- Normalizes response format
- Handles error recovery & retries
- Enables rate limiting

### 7.2 Server Actions over API Routes

Prefer Next.js Server Actions for data mutations (feedback, notifications). API routes are used only for:
- ABEMIS proxy endpoints (external data)
- Better Auth catch-all route
- Webhook receivers

### 7.3 Scoping Rules

Admin users are scoped to specific municipalities. They can only:
- View projects in their assigned municipality
- Moderate feedback for their municipality
- See analytics for their scope

Super Admins have unrestricted access.

### 7.4 Upstash Workflows for Background Jobs

Long-running tasks (email sending, notification fan-out) are handled by Upstash Workflows to avoid blocking the request cycle and to ensure reliability with automatic retries.

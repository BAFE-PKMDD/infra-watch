# InfraWatch Route and API Inventory

**Inventory basis:** current working tree on 2026-09-20.
**Counts:** 44 page routes and 42 API route files.

Route groups in parentheses are omitted from public URLs. Dynamic segments are shown as `[id]` or their source name.

## 1. Page routes

### Public pages

| Route | Function | Access/status |
| --- | --- | --- |
| `/` | Public landing page, project summary, featured/live content | Public; implemented |
| `/about` | Mandate and reference material | Public; implemented |
| `/citizen-feed` | Approved community activity, feedback composer, feed interaction | Public read; authenticated participation |
| `/contact` | Contact form | Public; implemented |
| `/data-deletion` | Data-deletion request guidance | Public; implemented |
| `/data-privacy` | Privacy notice | Public; implemented |
| `/evidence-map` | Public-safe geolocated citizen evidence | Public; implemented |
| `/faq` | Static public guidance | Public; implemented |
| `/infra-analytics` | ABEMIS-derived public project portfolio analytics | Public; implemented |
| `/live` | Active/scheduled live and recorded content | Public; implemented |
| `/map` | Source-backed infrastructure project map | Public; implemented |
| `/projects` | Searchable/filterable project directory | Public; implemented |
| `/projects/[id]` | Public project passport/detail | Public; implemented |
| `/report-issue` | Public E-Report directory and reporting methods | Public; implemented |
| `/report-issue/[id]` | Public-safe E-Report detail/activity | Public; implemented |
| `/report-issue/new` | E-Report form | Public; anonymous/authenticated submission |
| `/report-issue/sms` | SMS format/instructions using sample-only placeholder | Development-only prototype |
| `/terms-of-service` | Terms and submission/moderation rules | Public; implemented |

### Authentication pages

| Route | Function | Access/status |
| --- | --- | --- |
| `/sign-in` | Password/OAuth sign-in and OTP verification UI | Public; implemented, production email dependency incomplete |
| `/sign-up` | Account registration and OTP verification UI | Public; implemented, production email dependency incomplete |
| `/forget-password` | Password-reset OTP flow | Public; implemented, production email dependency incomplete |

### Citizen account pages

| Route | Function | Access/status |
| --- | --- | --- |
| `/my-profile` | View account details and update phone | Authenticated |
| `/my-feedbacks` | List/filter own feedback and moderation outcomes | Authenticated |
| `/my-issues` | List/filter own E-Reports | Authenticated |
| `/my-issues/[id]` | Owner-safe E-Report detail and responses | Authenticated owner/staff-aware API |
| `/my-notifications` | Persistent notification history/read state | Authenticated |

### Staff/admin pages

| Route | Function | Access/status |
| --- | --- | --- |
| `/dashboard` | Scoped managerial project analytics and drillthrough | Admin/moderator with analytics permission and assigned scope |
| `/executive-brief` | AI-generated managerial brief | Authorized; managerial AI flag required |
| `/admin-projects` | Scoped synchronized-project directory/statistics | Admin/moderator with project-list permission |
| `/feedbacks` | Scoped feedback moderation | Admin/moderator with feedback-list permission |
| `/issues` | Scoped E-Report management queue | Admin/moderator with issue-list permission |
| `/issues/[id]` | Private issue review, notes, responses, status | Admin/moderator with issue permission and scope |
| `/issues/sms-review` | Live SMS review queue (synthetic fallback if the feed is unreachable) | Authorized development-only prototype |
| `/issues/sms-review/[id]` | Live SMS detail/tagging (synthetic fallback if the feed is unreachable) | Authorized development-only prototype |
| `/reports/issues` | Issue response/resolution SLA report | Administrator only |
| `/reports/feedbacks` | Feedback moderation SLA report | Administrator only |
| `/sync` | ABEMIS sync status/history/manual trigger | View permission; trigger restricted to administrator |
| `/data-quality` | Read-only project data-quality findings/export | Authorized staff; no corrections |
| `/audit-logs` | Audit/security/upload/sync event review | Authorized staff with audit-log view permission |
| `/knowledge-base` | KB upload/FAQ/index/archive/reindex/delete management | Admin/moderator; critical endpoint/storage gaps documented |
| `/live-videos` | Live-video administration list/statistics | Administrator only |
| `/live-videos/new` | Create live-video entry | Administrator only |
| `/live-videos/[id]` | Edit live-video entry | Administrator only |
| `/user-management` | User, role, scope, ban, verification, session administration | Administrator only |

## 2. API routes

### Authentication and public/citizen APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET, POST` | `/api/auth/[...all]` | Better Auth endpoints | Endpoint-specific Better Auth rules |
| `GET` | `/api/projects` | Search/list public project records | Public |
| `GET` | `/api/projects/[id]` | Public project detail | Public |
| `GET, POST` | `/api/projects/[id]/feedback` | List approved project feedback; create feedback | Public read; authenticated create |
| `PATCH, DELETE` | `/api/projects/[id]/feedback/[feedbackId]` | Edit/delete own feedback | Authenticated owner |
| `GET, POST` | `/api/issues` | List public-safe issues; create E-Report | Public; optional session attached to submission |
| `GET` | `/api/issues/[id]` | Public/owner/staff-aware issue detail | Public-safe by default; session-aware disclosure |
| `GET` | `/api/my-feedbacks` | Current user's feedback | Authenticated |
| `GET` | `/api/my-issues` | Current user's E-Reports | Authenticated |
| `GET` | `/api/evidence` | Public-safe map evidence | Public |
| `GET` | `/api/kml-proxy` | Resolve project KML/source map content | Public with project identifier validation |
| `POST` | `/api/upload` | Validate/moderate/store upload | Authenticated |
| `GET` | `/api/upload/preview` | Authorized stored-file preview | Authenticated |
| `GET, POST` | `/api/notifications` | List notifications; mark read | Authenticated user |
| `GET` | `/api/notifications/stream` | Notification SSE stream | Authenticated user |
| `POST` | `/api/chat` | Public/project/knowledge AI chat stream | Controlled by chat-auth policy and rate limits |

### Administrative analytics APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET` | `/api/admin/analytics` | Scoped dashboard aggregate | Analytics permission + assigned moderator scope |
| `GET` | `/api/admin/analytics/breakdown` | Bounded dimension breakdown | Analytics permission + scope |
| `GET` | `/api/admin/analytics/drillthrough` | Bounded project drillthrough | Analytics permission + scope |
| `POST` | `/api/admin/analytics/assistant` | Managerial AI/corresponding executive brief generation | Analytics permission + scope + feature policy |
| `GET` | `/api/admin/chat-history` | Authorized AI chat-history listing | Admin/moderator with visibility rules |

### Administrative project and synchronization APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET` | `/api/admin/projects` | Scoped project list | Project-list permission |
| `GET` | `/api/admin/projects/stats` | Scoped project totals/budget/status | Project-list permission |
| `GET, POST` | `/api/admin/sync` | Read sync status; trigger synchronization | View permission for GET; trigger permission for POST |
| `GET` | `/api/admin/sync-logs` | Sync history | Sync-view permission |

### Feedback administration APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET` | `/api/admin/feedback` | Scoped feedback list/search | Feedback-list permission + scope |
| `GET` | `/api/admin/feedback/stats` | Scoped feedback totals/rating | Feedback-list permission + scope |
| `PATCH` | `/api/admin/feedback/[feedbackId]/moderate` | Approve/reject feedback | Approve/reject permission + scope |
| `DELETE` | `/api/admin/feedback/[feedbackId]` | Permanently delete feedback | Feedback-delete permission + scope |

### E-Report administration APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET` | `/api/admin/issues` | Scoped E-Report list/search | Issue-list permission + scope |
| `GET` | `/api/admin/issues/stats` | Scoped issue status totals | Issue-list permission + scope |
| `GET, DELETE` | `/api/admin/issues/[id]` | Private issue detail; permanent deletion | Corresponding issue permission + scope |
| `POST` | `/api/admin/issues/[id]/responses` | Add response/internal note and optionally change status | Issue-respond permission + scope |

### Data quality and audit APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `GET` | `/api/admin/data-quality` | Analyze/filter project findings | Data-quality view permission |
| `GET` | `/api/admin/data-quality/export` | Export recommendations | Data-quality view permission |
| `PATCH` | `/api/admin/data-quality/projects/[projectId]` | Explicitly rejects correction requests with `405` | No mutation performed |
| `GET` | `/api/audit-logs` | Filtered audit log | Audit-log view permission enforced in query action |

### Knowledge-base APIs

| Method | Route | Function | Access/current issue |
| --- | --- | --- | --- |
| `POST` | `/api/knowledge-base/upload` | Validate/store KB document and trigger indexing | Authenticated admin/moderator |
| `GET` | `/api/knowledge-base/files/[id]` | Download KB source file | Authenticated + KB read permission |
| `POST` | `/api/knowledge-base/process` | Extract/chunk/embed/reindex document | Authenticated + `knowledge_base:embed` |

### Voice APIs

| Method | Route | Function | Access |
| --- | --- | --- | --- |
| `POST` | `/api/voice/wake-token` | Issue signed wake-word token | Administrator only |
| `POST` | `/api/voice/transcribe` | Validate/send audio to local Whisper service | Administrator only |

## 3. Non-route server functions by domain

### Project/source services

- `fetchInfraProjects()`, `fetchAllInfraProjects()` — ABEMIS retrieval
- `transformAbemisProject()`, `isInfraWatchProject()` — normalization/eligibility
- `syncAbemisProjects()` — synchronization and logging
- `getPublicProjects()`, `getPublicMapPins()`, `getPublicProjectById()` — public read model
- `getAdminProjects()`, `getAdminProjectStats()` — scoped admin read model
- `captureProjectMetricSnapshots()`, `pruneProjectMetricSnapshots()` — trend history

### Participation services

- Feedback create/read/update/delete/moderate, votes, comments, and auto-acknowledgment
- Issue public create/read, owner list/detail, staff list/detail/respond/delete
- Notification recipient selection, persistence, read state, and SSE broadcast
- Contact-message creation

### Analytics and reports

- Public project aggregation
- Managerial dashboard aggregate/breakdown/drillthrough/trends
- Completion forecasts and schedule-health classification
- Issue/feedback SLA reports
- Optional managerial AI tools and executive brief generation

### Knowledge and AI

- Bounded chat request/rate/history/stream lifecycle
- Project/statistics/delay/knowledge tools
- File extraction, chunking, embedding, and KB search
- Provider selection for Google, OpenAI, Anthropic, or Kimi

### Media, geography, and safety

- File type/extension/signature/size validation
- Text and optional NSFW image moderation
- MinIO upload/download/delete
- Image/photo GPS extraction
- Geo-video/sidecar parsing and playback
- Philippine coordinate validation
- Public media/geotag sanitization

### Administration

- User creation/update/role/scope/ban/session/delete/verification actions
- Audit record creation and event filtering
- Live-video create/update/delete/active/live behavior
- Data-quality analysis/export
- Scheduled sync, retention cleanup, acknowledgment, and SLA reminders

### Prototype-only SMS services

- Server-side fetch and mapping of the live SMS grievance API, with deterministic synthetic fixtures as an offline fallback
- Browser-local state/store validation
- Transition requirements and project-tag policy
- Mapping of accepted grievance to a sample admin issue

## 4. Coverage note

This inventory covers every current `app/**/page.tsx` and `app/api/**/route.ts` file found during the audit. A route's presence does not by itself prove that its external dependencies are configured or healthy in a deployed environment.

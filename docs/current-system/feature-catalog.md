# InfraWatch Feature Catalog

This catalog describes product and operational functions visible in the current working tree. It does not attempt to list every utility function; API and domain-service inventories are included so each product workflow can be traced to its implementation.

## 1. Actors and authorization

| Actor | Current role/value | Effective boundary |
| --- | --- | --- |
| Public visitor | No session | Public pages, public project/issue/feedback data, project analytics, live content, contact form, and policy pages |
| Authenticated citizen | `citizen` | Public functions plus submitting project feedback, uploads, own feedback/issues, notifications, and profile phone update |
| Moderator | `moderator` | Staff features allowed by `lib/permissions.ts`, restricted by assigned project region and/or program where scope checks are implemented |
| Administrator | `admin` | All declared application permissions, including user management, sync trigger, system settings, admin-only SLA reports, and live-video administration |

There is no implemented `super_admin` role. Moderator scope is fail-closed when no region or program assignment exists. The database column `assignedAgency` is currently used as a project **program** scope.

Primary sources: `lib/permissions.ts`, `lib/session.ts`, `lib/scope.ts`, `app/(admin)/layout.tsx`.

## 2. Public portal features

### 2.1 Home (`/`)

**Status:** Implemented

Functions:

- Presents the InfraWatch public portal and current infrastructure summary.
- Uses project portfolio analytics from `actions/query/analytics.query.ts`.
- Surfaces featured/current live-video information from `actions/query/live-videos.query.ts`.
- Links to projects, maps, public analytics, live broadcasts, citizen participation, policies, and authentication.

Limitations:

- Its totals depend on the local synchronized ABEMIS read model and latest successful sync.
- It does not measure visitors or demographic characteristics.

### 2.2 Project directory (`/projects`)

**Status:** Implemented

Functions:

- Searches by project name, ABEMIS ID, project code, or contractor.
- Filters by program, region, province, municipality, barangay, public status, and funding year.
- Sorts by latest sync, name, budget, or funding year.
- Supports paginated list/grid presentation with URL-serializable directory state.
- Displays source name and last successful synchronization time.

Data path:

`/projects` → `projects-directory-client.tsx` → `getPublicProjects()` → PostgreSQL `projects` table.

Source: `actions/query/public-projects.query.ts`, `lib/public-project-directory.ts`.

### 2.3 Project record (`/projects/[id]`)

**Status:** Implemented

Functions:

- Resolves a project by ABEMIS ID, project code, or local UUID.
- Presents project identity, location, program, implementation data, approved budget, ABC/supplier bid field, status/stage, dates, reported physical progress, contractor, quantities, source media, coordinate availability, data coverage, and freshness.
- Shows only sanitized source media/geotags.
- Displays approved project feedback and allows navigation into reporting/feedback actions.
- Omits map coordinates when the source coordinate pair is not usable.

Important boundary:

- Current code exposes a `financialProgress` value, but the source transform appears to derive it from a POW target rather than a confirmed financial-progress field. See the enhancement assessment before treating it as authoritative.

Sources: `actions/query/public-projects.query.ts`, `lib/public-project-record.ts`, `lib/public-source-media.ts`, `components/projects/project-detail-client.tsx`.

### 2.4 Infrastructure project map (`/map`)

**Status:** Implemented

Functions:

- Applies project-directory filters to source-backed map markers.
- Includes only coordinate pairs within Philippine bounds.
- Opens bounded project details and links to the full project record.
- Uses explicit marker status/legend behavior.

Sources: `getPublicMapPins()`, `getPublicMapProjectDetails()`, `lib/public-project-map.ts`.

### 2.5 Citizen evidence map (`/evidence-map`)

**Status:** Implemented

Functions:

- Displays geolocated public evidence from approved/public-safe feedback and issue records.
- Uses sanitized media and coordinate data.
- Provides map-driven navigation to the relevant public record/project.

Sources: `app/api/evidence/route.ts`, `components/shared/system-evidence-map-client.tsx`.

### 2.6 Public infrastructure analytics (`/infra-analytics`)

**Status:** Implemented

Functions:

- Reports total project target/count, project stages, approved-budget total and coverage, completion/turnover summary, mapped-project coverage, region totals, and banner-program totals.
- Shows source and synchronization freshness.
- Returns explicit empty/unavailable states and rejects aggregation beyond 30,000 rows.

This is **project portfolio analytics**, not visitor analytics.

Source: `actions/query/analytics.query.ts`.

### 2.7 Citizen feed (`/citizen-feed`)

**Status:** Implemented

Functions:

- Shows approved community feedback/activity with project context.
- Supports category/feed interaction, helpful votes, comments, and project navigation.
- Shows community summary/sidebar information.
- Lets an authenticated user select an actual project, write feedback, optionally rate it, attach up to five supported media files, and request public anonymity.

Privacy behavior:

- Public anonymity hides the author in public presentation; the authenticated `userId` remains stored and visible to authorized moderation workflows.
- Uploaded media may contain location metadata extracted in the browser for evidence mapping.

Sources: `components/feedback-feed/`, `actions/query/activity-feed.query.ts`, `actions/query/community-stats.query.ts`, feedback vote/comment mutations.

### 2.8 Project feedback submission

**Status:** Implemented; authenticated only

Inputs:

- Source-backed project selection
- Comment (maximum 2,000 characters in the composer)
- Category: general, quality, progress, or concerns
- Optional 1–5 rating
- Optional public-anonymous flag
- Up to five image/video attachments

Processing:

- Files are validated and moderated by `/api/upload`.
- Feedback is stored as `pending`.
- Staff recipients are notified according to project scope.
- Pending feedback is auto-acknowledged after the configured delay.
- Only approved feedback is public.

Sources: `components/feedback-feed/feedback-composer.tsx`, `app/api/projects/[id]/feedback/route.ts`, `lib/feedback-auto-acknowledgment.ts`.

### 2.9 E-Report directory and public detail (`/report-issue`, `/report-issue/[id]`)

**Status:** Implemented

Functions:

- Lists public-safe issue records with search/filter controls.
- Shows public issue details, evidence, location/map when available, status/activity, and public staff responses.
- Public DTO code removes private/internal response information and unsafe evidence fields.

Sources: `app/api/issues/route.ts`, `app/api/issues/[id]/route.ts`, `lib/public-issue-dto.ts`, `lib/public-issue-activity.ts`.

### 2.10 E-Report submission (`/report-issue/new`)

**Status:** Implemented; anonymous and authenticated submission paths

Functions:

- Selects an actual project when applicable.
- Collects issue category, description, location, optional source-backed coordinates, reporter mode/contact details, and evidence.
- Supports image and geo-video evidence, including supported GPS sidecar parsing.
- Produces a ticketed `pending` issue and staff notifications.
- Stores a `reporterUserId` when a session exists; verified/non-anonymous reports require identifying contact information.

Sources: `app/(public)/report-issue/new/report-issue-form.tsx`, `app/api/issues/route.ts`, upload/geolocation utilities.

### 2.11 SMS reporting guide (`/report-issue/sms`)

**Status:** Prototype

- Available only outside production.
- Shows the sample citizen SMS format and an official-number placeholder.
- States that the sample does not send a real message.
- Does not connect to an SMS provider, receive a webhook, or persist a grievance.

Source: `app/(public)/report-issue/sms/page.tsx`, `components/report-issue/sms-grievance-guide.tsx`.

### 2.12 Live broadcasts (`/live`)

**Status:** Implemented

Functions:

- Presents active and scheduled Facebook, YouTube, or uploaded recorded-video entries.
- Highlights the single current live/featured item according to configured state.
- Hides inactive, not-yet-published, or expired entries from public queries.

Sources: `actions/query/live-videos.query.ts`, `components/live/live-broadcasts-client.tsx`.

### 2.13 Public AI assistant

**Status:** Implemented; availability depends on AI/embedding configuration

Functions:

- Accepts bounded chat requests through `POST /api/chat`.
- Uses deterministic tools for project search, exact project details, project statistics, delayed-project summaries, and approved knowledge-base search.
- Streams the response and records bounded server-owned chat history with expiry.
- Applies per-client and global database-backed request limits.
- Can require authentication through `CHAT_REQUIRE_AUTH`.
- Restricts managerial/voice presentation to authorized surfaces/roles.

Sources: `app/api/chat/route.ts`, `lib/chat-*`, `lib/chat-tools.ts`, `lib/ai-provider.ts`.

### 2.14 Informational and legal pages

**Status:** Implemented

| Route | Function |
| --- | --- |
| `/about` | Mandate and reference material presentation |
| `/faq` | Static public guidance and explanations |
| `/contact` | Contact-message submission |
| `/data-privacy` | Current privacy notice |
| `/data-deletion` | Data-deletion request guidance |
| `/terms-of-service` | Use, submission, and moderation terms |

The contact flow stores a contact message through `createContactMessage()`. The repository does not include a dedicated contact-message admin page in the current route inventory.

### 2.15 Language and presentation controls

**Status:** Implemented

- English/Filipino language context and language dialog/toggle
- Light/dark theme saved in browser local storage
- Responsive public/admin navigation
- Notification overlay for authenticated users

Sources: `providers/language-provider.tsx`, `components/language/`, `components/layout/app-header.tsx`.

## 3. Authentication and citizen account features

### 3.1 Registration, sign-in, verification, and recovery

Routes: `/sign-up`, `/sign-in`, `/forget-password`, `/api/auth/[...all]`

Functions:

- Email/password registration and sign-in
- Optional Google OAuth
- Email verification and reset OTP UI
- Better Auth database sessions
- Failed-authentication audit events
- Ban/session enforcement through the Better Auth admin plugin

Production limitation:

- Email verification is required, but the current auth callback does not send production verification mail; it logs only outside production. Account onboarding/recovery is therefore incomplete until delivery is wired and verified.

### 3.2 My profile (`/my-profile`)

**Status:** Implemented; authenticated

- Shows name, email, role, and current phone number.
- Allows the user to update their own phone number.
- Redirects unauthenticated users to sign-in.

There are no age, gender, birth-date, visitor-type, or demographic-consent fields in the current user schema.

### 3.3 My feedback (`/my-feedbacks`)

**Status:** Implemented; authenticated

- Lists the current user’s feedback, including feedback submitted with the public-anonymous flag.
- Filters/searches local results and shows pending/approved/rejected status.
- Shows automatic acknowledgment and moderation notes.
- Opens evidence media and project links.

### 3.4 My issues (`/my-issues`, `/my-issues/[id]`)

**Status:** Implemented; authenticated

- Lists and filters issues associated with the signed-in user.
- Shows status counts and response counts.
- Detail view shows evidence, source-backed location, public responses, and status history.
- The issue API allows owner access while keeping private/admin data out of public responses.

### 3.5 My notifications (`/my-notifications`)

**Status:** Implemented; authenticated

- Lists durable per-user notifications.
- Filters and marks notification records read.
- Receives realtime updates through authenticated server-sent events.

Durability boundary: database notification history is persistent; live fan-out is process-local and will not propagate across multiple application replicas.

## 4. Staff and administrative features

All admin pages pass through `app/(admin)/layout.tsx`, which requires an admin or moderator. Individual server actions and APIs enforce the relevant permission and, where implemented, moderator region/program scope.

### 4.1 Managerial analytics (`/dashboard`)

**Status:** Implemented

Functions:

- Filters by source-backed portfolio dimensions.
- Shows total projects, budgets/coverage, schedule-health calculations, progress reporting, delayed projects, priority projects, region performance, project-type budget, funding-year data, trend snapshots, progress variance, and data freshness.
- Supports chart-to-filter interaction and bounded drillthrough to project records.
- Enforces row limits and moderator scope.
- Optionally exposes a managerial AI copilot when `ENABLE_MANAGERIAL_AI=true`.

Sources: `lib/analytics/managerial-dashboard-query.ts`, `app/api/admin/analytics/*`, `components/admin/dashboard/`.

### 4.2 Executive brief (`/executive-brief`)

**Status:** Configuration-dependent

- Uses the same authorized managerial filter scope.
- Generates a management-oriented brief through the configured AI provider.
- Includes handling/disclaimer text, retry/staleness behavior, and locally keyed persistence.
- Is shown only when managerial AI is enabled.

Sources: `lib/analytics/executive-brief.ts`, `app/api/admin/analytics/assistant/route.ts`.

### 4.3 Administrative project directory (`/admin-projects`)

**Status:** Implemented

- Searches and filters synchronized projects.
- Shows portfolio statistics and paginated project records.
- Applies moderator region/program scope.
- The current project record is principally an ABEMIS read model; the page is not a general project-authoring system.

Sources: `app/api/admin/projects/route.ts`, `app/api/admin/projects/stats/route.ts`, `lib/abemis/sync.ts`.

### 4.4 Feedback moderation (`/feedbacks`)

**Status:** Implemented

- Lists scoped feedback and statistics.
- Searches by comment, submitter, project, or identifier.
- Opens full feedback/media detail.
- Transitions pending feedback to `approved` or `rejected` with optional moderation notes.
- Can permanently delete a feedback record and attempt attachment deletion.
- Writes audit records and updates affected public/citizen views.

Authorization: moderator/admin feedback permissions plus project scope.

### 4.5 E-Report management (`/issues`, `/issues/[id]`)

**Status:** Implemented

- Lists scoped E-Reports, status totals, search, and pagination.
- Displays private reporter details and complete evidence to authorized staff.
- Adds public responses or internal notes and optionally changes status.
- Publishes a public-safe issue description through the response policy.
- Can permanently delete the issue, evidence references, and response history.
- Writes audit records and notifies the reporter/authorized recipients.

Current states: `pending`, `reviewing`, `resolved`, `closed`.

Important limitation: the server currently accepts arbitrary transitions among recognized states rather than enforcing an allowed transition graph.

### 4.6 SMS grievance review (`/issues/sms-review`, `/issues/sms-review/[id]`)

**Status:** Live (replies and review state); cases are not yet created in Issue Management

- Available to signed-in admin/moderator/regional-admin staff.
- Loads real, untriaged messages server-side from the SMS grievance line's API (`SMS_GRIEVANCE_API_URL`); falls back to deterministic synthetic records, with a visible on-page warning, if that feed can't be reached.
- Preserves the original SMS text exactly as received. Staff decisions (tags, routing, status, notes and the SMS thread) are saved in the `sms_grievance_reviews` table and overlaid on the feed, so every reviewer sees the same state. Each write is version-checked, so two reviewers can't both send the same reply.
- Tagging a project, marking `Not a BAFE project`, linking a follow-up to an existing case, and the Reply tab each send a real SMS to the sender through `lib/sms.ts` (`SMS_API_URL` and related variables). The decision is saved before the SMS is sent; a failed send is shown as failed in the thread. Senders without a mobile number can be reviewed but not texted. Internal notes are never sent.
- Optional automatic first reply: with `ENABLE_SCHEDULER=true`, `SMS_AUTO_ACK_ENABLED=true` and `SMS_AUTO_ACK_SINCE=<ISO date>`, a once-a-minute job texts the Project Type/Name/Age/Gender/Location request to each new message received at or after that date, at most once per message.
- Lets staff select an actual BAFE project from current InfraWatch project records. A parser/project phrase is only a clue; it cannot confirm a project.
- "Simulate incoming message" remains a non-production test tool: those test messages live only in the staff member's browser storage.
- Does not yet create rows in `issues`; case tracking happens on this page only.

Sources: `lib/sms-grievance/` (`live-review.ts`, `review-store.ts`, `auto-acknowledge.ts`), `actions/mutation/sms-grievance.mutation.ts`, `types/sms-grievance.types.ts`, admin SMS components/routes.

### 4.7 SLA reports (`/reports/issues`, `/reports/feedbacks`)

**Status:** Implemented; administrator only

- Applies a date range.
- Calculates average, median, minimum, and maximum response times; response distribution; daily trends; resolution rate; and breach flags.
- Issue first response means the earliest non-internal response.
- Feedback response means a real moderation decision; automatic acknowledgment does not count.
- Supports report download through the UI.

Source: `actions/query/reports.query.ts`.

### 4.8 ABEMIS synchronization (`/sync`)

**Status:** Implemented

- Shows sync statistics and history.
- Administrator can trigger a manual sync; moderator can view logs.
- Scheduled sync runs every three hours by default and skips when a successful run occurred within 20 hours.
- Fetches paginated data from `/api/infra-amefip-list`, filters InfraWatch-eligible projects, transforms/upserts records, logs results, and captures daily metric snapshots.

Sources: `lib/abemis/`, `app/api/admin/sync/route.ts`, `lib/scheduler.ts`.

### 4.9 Data Quality (`/data-quality`)

**Status:** Implemented as recommendation/export-only

- Detects missing, inconsistent, stale, or implausible source fields.
- Filters and paginates findings.
- Exports findings for source-system follow-up.
- Does not repair, archive, delete, or write corrections to project records.
- The apparent project PATCH endpoint deliberately returns `405`.

Sources: `lib/data-quality/`, `app/api/admin/data-quality/`.

### 4.10 Audit logs (`/audit-logs`)

**Status:** Implemented

- Lists authorized audit/security/upload/sync events.
- Filters by event group/source, action, category, date, and search text.
- Reports failed logins, blocked uploads, NSFW blocks, record changes, and sync activity.
- Displays stored IP address and user-agent fields to authorized staff.

Sources: `actions/query/audit-logs.query.ts`, `lib/audit.ts`.

### 4.11 Knowledge base (`/knowledge-base`)

**Status:** Implemented; production storage rollout verification remains pending

- Uploads supported documents to object storage.
- Adds direct FAQ question/answer entries.
- Extracts text, chunks content, creates embeddings through an OpenAI-compatible Ollama endpoint, and stores vector chunks in PostgreSQL.
- Lists documents/statistics/categories and allows archive, restore, reindex, download, and permanent deletion after archive.
- Archived documents are excluded from retrieval.

Security boundaries:

- `POST /api/knowledge-base/process` requires an authenticated user with `knowledge_base:embed`.
- Archived documents cannot be processed directly, persisted failures are sanitized, and reindexing keeps the prior chunks until replacement chunks can be swapped transactionally.
- Knowledge-base files and issue evidence use the distinct private bucket and authenticated application reads; public object access is limited to approved public-media prefixes. Issue evidence is restricted to its owner, administrators, or moderators within scope.
- Node startup reconciles the restricted public policy before starting scheduled work and rejects any anonymous `Allow` statement on the private bucket.
- Production deployment must configure `MINIO_PRIVATE_BUCKET_NAME` and verify both bucket policies before the storage finding is operationally closed.
- There is no explicit draft/published/public visibility field; active embedded documents are eligible for public chat retrieval.

### 4.12 Live-video administration (`/live-videos`, `/live-videos/new`, `/live-videos/[id]`)

**Status:** Implemented; administrator only

- Creates/edits/deletes Facebook Live, YouTube, or recorded-video entries.
- Uploads recorded video/thumbnail assets.
- Controls active, featured, live, ordering, publication, and expiry state.
- Enforces at most one live and one featured item transactionally.
- Validates HTTPS provider URLs and schedule/state compatibility.

### 4.13 User management (`/user-management`)

**Status:** Implemented; administrator only

- Lists/searches/filter users and role/status totals.
- Creates verified users.
- Updates user profile fields and roles.
- Assigns moderator region and program scope.
- Bans/unbans users, manually verifies email, terminates all sessions, and permanently deletes users.
- Prevents self-role change, self-ban, self-session termination, and self-deletion.
- Writes audit records.

### 4.14 ANIA voice assistant

**Status:** Configuration-dependent; administrator only

- Controlled by `VOICE_ASSISTANT_ENABLED`.
- Issues signed wake-word tokens to administrators.
- Supports local wake-word and sleep-word services.
- Sends bounded audio to a private local Whisper transcription endpoint.
- Uses Kokoro in-browser/worker speech where configured and supports browser fallback behavior in client code.
- Applies concise speech summarization and conversational state transitions.

Production Compose does not currently define the wake-word or Whisper sidecars.

## 5. Background and automated functions

| Job | Schedule/trigger | Function |
| --- | --- | --- |
| ABEMIS sync | Every three hours by default; skip after recent success | Refresh project read model and snapshots |
| Chat history cleanup | Daily 03:15 Asia/Manila | Delete expired AI chat records |
| Feedback acknowledgment | Every minute | Acknowledge eligible pending feedback after the five-minute threshold |
| SLA follow-up reminders | Every 15 minutes | Notify staff at gentle, urgent, and breach checkpoints |

These use `node-cron` inside the application process. They are not durable queue jobs and have no cross-replica leader election.

## 6. Data and storage functions

### PostgreSQL application tables

- Projects and optional correction history
- Feedback
- Issues and issue responses
- Sync logs and project metric snapshots
- Audit logs
- AI chat history and rate limits
- PSGC locations
- Notifications and recipients
- Knowledge-base documents and chunks
- Live videos

### Authentication tables

- Users
- Sessions
- Provider/password accounts
- Verification tokens

### Object storage

MinIO uses the public bucket for approved public-media prefixes (`feedback/`, `feedback-comment/`, and `live-videos/`) and a distinct private bucket for knowledge-base and issue-evidence paths. Private reads go through authenticated application handlers. Startup narrows the public policy and fails closed if the private bucket contains an anonymous `Allow` policy. Current code can still silently fall back to local `.storage` files when MinIO is unavailable; this is not durable in a container/restarted replica.

## 7. API route inventory

| Group | Routes | Function and access |
| --- | --- | --- |
| Authentication | `/api/auth/[...all]` | Better Auth handlers |
| Public projects | `/api/projects`, `/api/projects/[id]` | Public project search/detail |
| Project feedback | `/api/projects/[id]/feedback`, `/api/projects/[id]/feedback/[feedbackId]` | Public approved list; authenticated create/owner edit/delete |
| E-Reports | `/api/issues`, `/api/issues/[id]` | Public list/create/detail with owner/staff-aware disclosure |
| Citizen account | `/api/my-feedbacks`, `/api/my-issues` | Authenticated owner lists |
| Evidence | `/api/evidence`, `/api/kml-proxy` | Public-safe evidence/map support |
| Uploads | `/api/upload`, `/api/upload/preview` | Authenticated validated upload and preview |
| Notifications | `/api/notifications`, `/api/notifications/stream` | Authenticated list/read/SSE |
| Public AI | `/api/chat` | Bounded project/knowledge chat; auth policy is configurable |
| Admin analytics | `/api/admin/analytics`, `/breakdown`, `/drillthrough`, `/assistant` | Authorized, moderator-scoped managerial data/AI |
| Admin projects | `/api/admin/projects`, `/stats` | Authorized scoped project list/statistics |
| Admin feedback | `/api/admin/feedback`, `/stats`, `/[feedbackId]`, `/moderate` | Authorized scoped moderation/delete |
| Admin issues | `/api/admin/issues`, `/stats`, `/[id]`, `/[id]/responses` | Authorized scoped queue/detail/response/delete |
| Data quality | `/api/admin/data-quality`, `/export`, `/projects/[projectId]` | Authorized read/export; mutation returns 405 |
| Synchronization | `/api/admin/sync`, `/api/admin/sync-logs` | Admin trigger; authorized history/status |
| Audit | `/api/audit-logs` | Authorized audit listing |
| Knowledge base | `/api/knowledge-base/upload`, `/files/[id]`, `/process` | Staff upload/download; processing requires `knowledge_base:embed` |
| Voice | `/api/voice/wake-token`, `/api/voice/transcribe` | Administrator only |
| Admin chat history | `/api/admin/chat-history` | Authorized history with role-based visibility |

## 8. Implemented analytics versus missing audience analytics

Implemented:

- Public project portfolio analytics
- Managerial project analytics and drillthrough
- Daily project metric snapshots/trends
- Issue and feedback response-time/SLA analytics
- Feedback moderation counts and approved-rating average
- User-role/account counts
- Audit/security event counts

Not implemented:

- Website page-view events
- Unique visitor/session analytics
- Download event analytics
- Engagement funnels
- Consent records for demographic analytics
- Age range, gender, audience type, or demographic fields
- Visitor/download demographic reports

The proposed design is documented in [Audience activity and demographic analytics](./audience-activity-and-demographic-analytics.md).

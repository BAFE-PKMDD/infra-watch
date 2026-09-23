# InfraWatch Workflows and State Transitions

This document traces end-to-end processes through actors, entry conditions, data, authorization, state changes, outputs, and follow-up behavior.

## 1. Project data lifecycle

### 1.1 Scheduled ABEMIS synchronization

```text
Application process starts
  → Next.js instrumentation initializes scheduler
  → Every three hours (default), check for a successful sync in last 20 hours
  → If recent success exists: skip
  → Otherwise create running sync log
  → Fetch ABEMIS pages in batches of 500
  → Keep InfraWatch-eligible projects
  → Transform source fields
  → Upsert projects in chunks
  → Record per-record failures and diagnostics
  → Mark sync completed or failed
  → On complete success, capture daily project metric snapshots
  → Prune snapshots older than 365 days
```

**Source endpoint:** `${ABEMIS_BASE_URL}/api/infra-amefip-list`
**Actors:** application scheduler; administrator for manual trigger
**Tables:** `projects`, `sync_logs`, `project_metric_snapshots`
**Outputs:** refreshed public/admin read model, sync history, analytics snapshots
**Authorization:** scheduled internal process; manual trigger requires `abemis_sync.trigger`

Important behavior:

- Source rows are processed incrementally; a failed run can leave earlier project writes applied.
- Project identity is upserted using ABEMIS identifiers.
- A source-ID correction fallback may delete/recreate a project when foreign keys block renaming. This can cascade/delete dependent feedback/snapshots and unlink issues; remediation is a critical enhancement.
- Snapshot capture runs only after a fully successful sync.
- The scheduler is process-local and has no database lease.

Sources: `instrumentation.ts`, `lib/scheduler.ts`, `lib/abemis/client.ts`, `lib/abemis/transform.ts`, `lib/abemis/sync.ts`, `lib/analytics/project-metric-snapshots.ts`.

### 1.2 Manual synchronization

```text
Administrator opens /sync
  → reviews last sync and history
  → starts manual sync
  → POST /api/admin/sync
  → authenticate and require abemis_sync.trigger
  → run same synchronization service
  → return statistics/errors
  → UI refreshes stats and history
```

Moderators can view sync history but cannot trigger a run. There is no current mutual-exclusion lock between a manual and scheduled run.

## 2. Public project discovery

```text
Visitor opens /projects or /map
  → choose search/filter/sort values
  → values are parsed into bounded directory state
  → query synchronized projects table
  → return sanitized public records and source freshness
  → list: paginate 20 records
  → map: discard missing/out-of-Philippines coordinate pairs
  → visitor opens /projects/[id]
  → resolve by ABEMIS ID, project code, or local UUID
  → return project passport + approved feedback + sanitized source media
```

**Inputs:** search term, program, location hierarchy, status, year, sort, page/view
**Outputs:** project list, markers, project passport, data-coverage/freshness indicators
**Persistence:** read-only
**Unknown handling:** missing fields are displayed as unavailable; map points are omitted rather than fabricated.

## 3. Public project analytics

```text
Visitor opens /infra-analytics or home summary
  → query bounded project analytics rows
  → if >30,000 rows: fail safe
  → classify project stages
  → aggregate region and banner program counts
  → sum available approved budgets
  → count valid mapped projects
  → attach latest successful sync timestamp
  → render ready, empty, or unavailable state
```

This process measures project data, not site visitors.

## 4. Authentication and account lifecycle

### 4.1 Citizen registration

```text
Visitor opens /sign-up
  → submits name, email, password
  → Better Auth creates citizen account
  → email verification is required
  → OTP interface requests/verifies token
  → verified user signs in
  → Better Auth creates database session
```

**State:** unverified account → verified account → active session
**Gap:** production verification delivery is not currently wired from the auth callback, so this workflow is not operationally complete.

### 4.2 Sign-in

```text
User submits credentials or optional Google OAuth
  → Better Auth validates identity/account status
  → failed attempt can be recorded in audit logs
  → successful authentication creates session
  → user returns to requested route or role-appropriate surface
```

Banned users are blocked by Better Auth. Sessions include IP-address and user-agent fields provided by the auth library.

### 4.3 Password recovery

```text
User opens /forget-password
  → requests reset OTP
  → verifies OTP
  → sets new password
```

Like registration verification, production mail delivery must be configured and tested before relying on this flow.

### 4.4 Profile update

```text
Authenticated user opens /my-profile
  → server verifies session
  → display name/email/role/phone
  → user changes phone number
  → server action validates ownership/session
  → update auth user record
```

No demographic attributes or demographic consent are collected.

## 5. Project feedback lifecycle

### 5.1 Submission

```text
Authenticated citizen opens /citizen-feed or project feedback surface
  → search and select actual project record
  → choose category
  → optionally rate project
  → write comment
  → optionally request public anonymity
  → optionally attach up to five images/videos
  → client extracts supported GPS evidence metadata
  → upload endpoint validates file path/type/size/signature
  → image moderation runs when enabled
  → object is stored in MinIO or local fallback
  → POST project feedback
  → server validates session, project, content, media, and category
  → create feedback(status=pending, userId=current user)
  → write audit event
  → notify scoped staff
  → show citizen confirmation
```

**Inputs:** project ID, comment, category, optional rating, anonymity flag, media
**Initial state:** `pending`
**Public output:** none until approval
**Citizen output:** visible in `/my-feedbacks`, including moderation outcome

Important privacy boundary:

- `isAnonymous=true` changes public display. It does not remove `userId` or prevent authorized staff from seeing the submitter.

### 5.2 Automatic acknowledgment and SLA reminders

```text
Every minute
  → find pending feedback older than five minutes without acknowledgment
  → set acknowledgment timestamp
  → notify citizen/staff as implemented

Every 15 minutes
  → inspect pending feedback age
  → apply gentle / urgent / breach checkpoints
  → send configured notifications/email/SMS
  → mark checkpoint timestamp
```

Current risk: checkpoint timestamps may be written before external delivery succeeds, preventing automatic retry after delivery failure.

### 5.3 Moderation

```text
Moderator/admin opens /feedbacks
  → permission check + project region/program scope
  → filter/search pending feedback
  → inspect full comment, submitter, project, rating, and media
  → choose Approve or Reject
  → optionally add moderation note
  → server repeats permission + scope checks
  → pending → approved OR pending → rejected
  → save moderator/timestamp/note
  → write audit record
  → refresh public and citizen views
```

**Approved:** appears in public project/community surfaces.
**Rejected:** remains hidden from public pages but visible to owner/staff as authorized.

The server can also moderate an already-decided record; there is no explicit “pending-only” state-transition constraint.

### 5.4 Owner edit/delete and staff deletion

Authenticated owners can edit/delete their own feedback through the project feedback API. Authorized staff can permanently delete scoped feedback and attempt to remove its attachments. Deletion is destructive and is not a reversible archive operation.

## 6. E-Report lifecycle

### 6.1 Citizen submission

```text
Visitor opens /report-issue/new
  → choose anonymous or identified reporting mode
  → optionally select source-backed project
  → choose issue category
  → provide description and location
  → optionally capture valid coordinate pair
  → optionally attach image/video/geo-video evidence
  → identified path supplies required name/contact information
  → POST multipart or JSON issue request
  → server validates fields, evidence, media, and coordinates
  → generate ticket number
  → create issue(status=pending)
  → associate reporterUserId when signed in
  → write audit record
  → notify scoped staff
  → return ticket/record confirmation
```

**Initial state:** `pending`
**Possible current states:** `pending`, `reviewing`, `resolved`, `closed`
**Project link:** optional for public E-Reports
**Public privacy:** private contact/internal data is removed by public DTO formatting.

### 6.2 Public and owner tracking

```text
Public visitor opens /report-issue/[id]
  → fetch issue
  → disclose only public-safe description, evidence, location, activity, and responses

Authenticated owner opens /my-issues/[id]
  → verify session and ownership
  → disclose owner-safe issue detail and responses
```

A staff role may receive additional authorized detail. Internal-only responses are never part of the public response timeline.

### 6.3 Staff review and response

```text
Moderator/admin opens /issues
  → server requires issue.list and applies scope
  → search/filter/select issue
  → open /issues/[id]
  → server requires issue.read and repeats scope check
  → inspect private reporter information and complete evidence
  → write response or internal note
  → optionally choose recognized target status
  → POST /api/admin/issues/[id]/responses
  → require issue.respond and scope
  → insert issue response
  → update issue status/public description/resolution date as applicable
  → write audit record
  → publish/persist notifications
```

Public-response policy:

- Internal notes remain staff-only.
- Publish-only changes can update the public description without creating duplicate public response records.
- A resolved transition sets `resolvedAt`; leaving resolved clears it as implemented.

Current integrity gap:

- There is no enforced transition graph. Any recognized target state may be submitted from another state.
- Response insertion, issue update, audit, and notification operations are not committed as one transaction.

### 6.4 Deletion

Authorized staff can permanently delete a scoped issue. The UI states that this removes the issue record, evidence references, and response history. This is not an archival workflow.

## 7. SMS grievance prototype

```text
Authorized moderator/admin opens development-only SMS review
  → synthetic SMS records load from fixtures + browser localStorage
  → select a sample message
  → original SMS remains immutable
  → staff decide:
      A. BAFE project
         → search current InfraWatch project records
         → explicitly select source-backed project
         → add required category/location/routing/reason
         → create browser-local sample case
      B. Not a BAFE project
         → record explicit reviewed decision/reason
         → close sample as out of scope
      C. Possible duplicate
         → link/record duplicate decision in prototype state
```

Constraints:

- Disabled when `NODE_ENV === "production"`.
- No inbound webhook, provider identifier, delivery receipt, outbound reply, database persistence, or production case creation.
- Parser text/candidate is a clue only; typed text cannot become a confirmed project.
- Project, location, category, responsible office, region, and assignee are separate fields.

## 8. Notifications lifecycle

```text
Domain event occurs
  → determine user recipients using project/issue scope
  → create one notification record
  → create per-user recipient rows
  → broadcast to connected in-process subscribers
  → authenticated browser receives SSE event
  → user opens notification page/bell
  → POST mark-read action updates recipient readAt
```

Persistent portion: notification and recipient rows.
Ephemeral portion: active SSE subscriptions and broadcast registry in one process.

## 9. Upload and evidence workflow

```text
Authenticated user selects file
  → client checks allowed type and size
  → server checks authenticated session
  → validate destination folder allowlist
  → validate MIME, extension, signature, and size
  → image moderation when configured
  → upload bytes to MinIO
  → on selected MinIO network failures, silently write local .storage fallback
  → return storage path
  → parent feedback/issue/live-video/KB record stores that path
```

Security/operational boundaries:

- Stored image bytes are not currently re-encoded to strip EXIF metadata.
- The fallback can report success for ephemeral local container storage.
- Public reads are limited to approved public-media prefixes; knowledge-base and issue-evidence paths use a distinct private bucket and authenticated application reads. Issue evidence requires owner, administrator, or scoped-moderator access.

## 10. Managerial analytics workflow

```text
Authorized admin/moderator opens /dashboard
  → parse URL filters using strict schema
  → reject invalid filters
  → determine viewer's region/program scope
  → count scope and enforce maximum row limit
  → aggregate project KPIs and data coverage
  → classify schedule health from dates/progress
  → query project-type, region, funding-year, trend, variance, and priority data
  → render charts/tables with unavailable/not-assessed states
  → user selects chart item
  → URL filters update or bounded drillthrough query returns matching projects
```

Managerial AI, when enabled:

```text
Authorized user opens copilot/brief
  → server confirms analytics permission and moderator scope
  → provide bounded dashboard context and tools
  → configured model generates answer/brief
  → retain verification and authorization-scope notices
  → store server-owned chat history under authorized visibility rules
```

## 11. SLA reporting workflow

```text
Administrator opens issue or feedback report
  → choose date range
  → require admin
  → query records created in range
  → issue: locate earliest non-internal response
  → feedback: use moderator decision timestamp
  → calculate response/resolution durations
  → classify response tier and SLA breach
  → compute summary, distribution, trend, and rows
  → render/download report
```

Automatic feedback acknowledgment is deliberately excluded from the feedback response metric.

## 12. Data-quality workflow

```text
Authorized staff opens /data-quality
  → query source projects under allowed scope
  → analyze records for configured issue types
  → display counts/findings and current source values
  → filter/search/paginate
  → export recommendations for source-system follow-up
```

No application action applies a correction. `PATCH /api/admin/data-quality/projects/[projectId]` always returns `405` with a recommendation-only explanation.

## 13. Knowledge-base lifecycle

### 13.1 Document upload

```text
Authorized admin/moderator opens /knowledge-base
  → upload supported document with title/category
  → server validates staff role and file metadata
  → store file in MinIO under knowledge-base path
  → create document(status=processing/indexing)
  → authenticated browser calls protected processing endpoint
  → download stored file
  → extract text
  → create bounded chunks
  → generate embeddings through configured local/Ollama-compatible endpoint
  → store chunks
  → document status → embedded or failed
```

### 13.2 FAQ entry

```text
Authorized staff creates FAQ question + answer
  → create document(status=indexing)
  → chunk and embed synchronously
  → status → embedded or failed
  → write audit record
```

### 13.3 Archive, restore, reindex, delete

- Active → archived: excluded from AI retrieval and audited.
- Archived → active: eligible for retrieval again and audited.
- Reindex: validate active state and trigger protected processing without deleting the current index; replacement chunks are generated first and swapped transactionally.
- Permanent delete: allowed only after archive; removes MinIO file where possible and cascades chunks.

The processing endpoint now authenticates the caller and requires `knowledge_base:embed` before loading or mutating a document.

## 14. Public AI chat lifecycle

```text
User submits bounded message/history
  → enforce request byte/message/history limits
  → resolve session and chat policy
  → derive owner/rate-limit identity without exposing raw identity to model tools
  → enforce per-minute and global-day limits
  → select configured AI model
  → model may invoke bounded tools:
      searchProjects
      getProjectStats
      getProjectById
      getDelayedProjectsSummary
      searchKnowledgeBase
  → stream answer
  → complete server-owned chat history record
  → on failure, mark terminal failure state
  → daily job removes expired history
```

Knowledge retrieval returns embedded, non-archived documents, but current schema lacks a separate public/published visibility state. This must be corrected before confidential/internal documents are indexed.

## 15. Live-video lifecycle

```text
Administrator creates or edits entry
  → select Facebook, YouTube, or recorded source
  → validate source URL/upload path
  → set active/featured/live/order/publish/expire values
  → validate state and schedule
  → transaction clears other featured/live record if necessary
  → save entry
  → revalidate home/live/admin routes
  → public queries include only active, currently publishable records
```

Deleting a live-video database record does not clearly guarantee deletion of its uploaded video/thumbnail assets; this should be verified and made explicit.

## 16. User-administration lifecycle

```text
Administrator opens /user-management
  → list/search/filter users and account statistics
  → select action:
      create account (immediately email-verified)
      update profile
      change role
      assign moderator region
      assign moderator program
      ban/unban
      verify email
      terminate all sessions
      permanently delete
  → server checks granular user permission
  → apply self-protection rule where relevant
  → mutate Better Auth/PostgreSQL record
  → write audit entry
  → revalidate user-management page
```

Changing a moderator's role does not automatically document/normalize stale scope fields; this is an enhancement opportunity.

## 17. Contact-message workflow

```text
Visitor opens /contact
  → submits validated contact form
  → server action creates contact-message record through current mutation path
  → show result
```

The permission model declares contact-message administration, but there is no current admin route for reviewing those messages. The storage implementation should be verified before production operations rely on this channel.

## 18. Deployment/startup workflow

```text
Build Docker image with Bun
  → install frozen dependencies
  → run Next.js standalone build with placeholder build-time DB/auth values
  → copy standalone output, migrations, scripts, lib, and public assets

Container starts
  → wait for PostgreSQL readiness (up to 30 attempts)
  → optionally prepare/apply migrations
  → run standalone server as non-root user
  → Next.js instrumentation reconciles public/private MinIO buckets and policies
  → fail startup if public/private buckets collide or the private policy has an anonymous Allow
  → initialize scheduler only after storage reconciliation succeeds
  → Docker health check requests root page
```

The production Compose file exposes the app only on loopback and attaches it to an external Docker network. PostgreSQL, MinIO, reverse proxy, and optional voice/embedding services are not defined in that Compose file.

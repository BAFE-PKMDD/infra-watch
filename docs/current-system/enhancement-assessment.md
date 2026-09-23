# InfraWatch Enhancement Assessment

This assessment separates production risks from optional product improvements. Priorities are based on confirmed repository behavior, not feature preference alone.

## Priority scale

- **P0 — Blocker:** resolve before expanding production use or exposing affected data.
- **P1 — High:** material security, data-integrity, privacy, or reliability risk.
- **P2 — Medium:** workflow correctness, governance, accessibility, or operational maintainability improvement.
- **P3 — Opportunity:** useful enhancement after higher-risk work is complete.

## Top 10 implementation checklist

- [x] **1. Protect knowledge-base processing.** `POST /api/knowledge-base/process` requires an authenticated user with `knowledge_base:embed`; archived records are rejected, client-visible/persisted Knowledge Base errors are sanitized, and reindex replacement chunks are swapped transactionally only after every chunk has been embedded successfully.
- [x] **2. Separate private and public object storage in code.** Knowledge-base and issue-evidence objects route to `MINIO_PRIVATE_BUCKET_NAME`; production server startup narrows the public policy before starting the scheduler and rejects any anonymous `Allow` on the private bucket; KB reads require knowledge-base permission, while issue evidence requires ownership, admin role, or moderator role with applicable scope. **Deployment verification remains required:** configure the distinct private bucket, migrate/copy legacy private objects, and verify live direct-object denial before claiming production exposure is closed.
- [ ] **3. Preserve project links during ABEMIS ID corrections.** Deferred for follow-up acceptance review. A related implementation commit already exists in the current branch, but it is outside this #1–#2 change scope.
- [ ] **4. Stop publishing unverified financial-progress semantics.** Deferred.
- [ ] **5. Strip EXIF and other metadata from stored images.** Deferred.
- [ ] **6. Complete production email verification and password recovery delivery.** Deferred.
- [ ] **7. Make scheduled jobs and realtime notification fan-out durable and multi-replica safe.** Deferred.
- [ ] **8. Enforce the E-Report state-transition graph and atomic response handling.** Deferred.
- [ ] **9. Add draft/review/published visibility governance to knowledge retrieval.** Deferred.
- [ ] **10. Implement privacy-safe audience activity and optional demographic analytics.** Deferred; design only exists today.

## 1. P0 production blockers

### P0.1 Protect knowledge-base processing

**Implementation status:** Code fix completed. Production deployment/runtime verification remains pending.

**Original finding:** `POST /api/knowledge-base/process` accepted a document ID and changed retrieval state without authentication or authorization.

**Current evidence:** `app/api/knowledge-base/process/handler.ts`, `app/api/knowledge-base/process/route.ts`, `lib/knowledge-base-processing-policy.ts`, `lib/knowledge-base-processing-client.ts`, and their focused tests. The processor rejects archived records, stores stable failure text, and retains the previous embedded index until a replacement can be committed transactionally.

**Risk:** arbitrary reindex/status mutation, expensive-resource denial of service, and unauthorized document processing.

**Recommended change:**

1. Remove direct public processing access.
2. Put indexing behind a durable internal job with a database lease/idempotency key.
3. If an HTTP worker boundary is required, use a short-lived signed job token, document ID allowlist, rate limit, and replay protection.
4. Repeat role/visibility checks at processing time.
5. Add authorization, idempotency, concurrent-reindex, and failure-recovery tests.

### P0.2 Separate private and public object storage

**Implementation status:** Code fix completed. A distinct production private bucket and live policy/access verification are required during deployment.

**Original finding:** the MinIO initialization policy granted public `GetObject` across the shared bucket while knowledge-base documents and citizen evidence were stored there.

**Current evidence:** `lib/minio.ts`, `lib/minio-url.ts`, `instrumentation.ts`, `lib/server-startup.ts`, `app/api/upload/preview/access.ts`, `app/api/upload/preview/handler.ts`, `app/api/knowledge-base/files/[id]/route.ts`, `.env.example`, and focused storage/access tests. Startup reconciles the restricted public policy before the scheduler starts and fails closed on any anonymous private-bucket `Allow` policy.

**Risk:** private/internal KB documents or citizen evidence may be directly retrievable if the object path is known.

**Recommended change:**

- Separate public published media from private evidence/knowledge documents using separate buckets or enforceably private prefixes.
- Serve private objects through authorized short-lived URLs or an authenticated streaming endpoint.
- Migrate existing objects and test direct unauthenticated access.
- Never rely on an application route to secure an object that the bucket policy exposes publicly.

### P0.3 Preserve immutable local project identity during ABEMIS ID corrections

**Finding:** when an ABEMIS ID rename fails because of foreign-key references, synchronization deletes and recreates the project.

**Evidence:** `lib/abemis/sync.ts`; foreign-key behavior in `lib/db/schema.ts`.

**Risk:** cascade deletion of feedback/snapshots and issue-project unlinking during a source identity correction.

**Recommended change:**

- Use an immutable local project UUID as the foreign-key target.
- Treat ABEMIS IDs/project codes as mutable external aliases with uniqueness/history.
- Migrate dependent references transactionally.
- Add a dry-run conflict report and regression tests proving feedback, issues, and snapshots survive source-ID correction.

## 2. P1 security, privacy, integrity, and reliability

### P1.1 Stop publishing unverified “financial progress”

**Finding:** the ABEMIS transform maps summed POW `target` data into `financialProgress`, while snapshot code acknowledges that no authoritative financial-progress source exists and stores null.

**Evidence:** `lib/abemis/transform.ts`, `lib/analytics/project-metric-snapshots.ts`, public/AI uses in `actions/query/public-projects.query.ts` and `lib/chat-tools.ts`.

**Risk:** a project-planning value may be represented publicly as actual financial progress.

**Recommended change:** make the field unavailable/null until BAFE approves an authoritative source mapping. Rename any legitimate target metric to its actual source meaning. Correct UI, API, AI tool, export, and historical-data semantics together.

### P1.2 Strip metadata from stored images

**Finding:** documentation promises EXIF stripping, but current upload paths moderate then persist the original image bytes.

**Evidence:** `app/api/upload/route.ts`, issue evidence upload code in `app/api/issues/route.ts`, `docs/09-security.md`.

**Risk:** unintended device/location metadata can remain in stored/downloaded images.

**Recommended change:** decode and re-encode supported images before persistence, drop metadata, validate output dimensions/signature, and test the bytes retrieved from storage. Preserve only explicitly consented evidence coordinates in structured fields.

### P1.3 Complete production email verification and recovery

**Finding:** email verification is required, but the auth callback does not send production verification mail. A separate SMTP helper exists but is not integrated into the Better Auth path.

**Evidence:** `lib/auth.ts`, `lib/email.ts`.

**Risk:** citizens may be unable to verify accounts or recover passwords in production.

**Recommended change:** connect verification/reset callbacks to a server-side mail provider, enforce delivery configuration through startup/readiness checks, avoid logging OTPs in production, and test success, expiry, replay, resend throttling, and unavailable-provider behavior.

### P1.4 Make scheduled jobs durable and single-owner

**Finding:** jobs are `node-cron` tasks initialized inside each application process. There is no persistent lease or leader election. Manual and scheduled synchronization can overlap.

**Evidence:** `instrumentation.ts`, `lib/scheduler.ts`, `lib/abemis/sync.ts`.

**Risk:** duplicate jobs on multiple replicas, overlapping writes, lost runs after restarts, and partial synchronization.

**Recommended change:**

- Use PostgreSQL advisory locks or a job table with leases.
- Recover abandoned runs.
- Make synchronization idempotent and publish a refreshed dataset only after a complete successful staging run where practical.
- Add explicit run correlation IDs and metrics.

### P1.5 Use an outbox for notifications and SLA delivery

**Finding:** reminder checkpoints can be marked before external email/SMS delivery succeeds. Live SSE is process-local.

**Evidence:** `lib/feedback-auto-acknowledgment.ts`, `lib/sla-followup.ts`, `lib/realtime-notifications.ts`, `lib/notification-persistence.ts`.

**Risk:** failed delivery may never retry; multi-replica clients may miss realtime events.

**Recommended change:** transactionally enqueue outbound notifications, track attempts/delivery/failure, retry with bounded backoff, and use PostgreSQL LISTEN/NOTIFY or another approved shared backplane for realtime fan-out.

### P1.6 Enforce issue transition policy and atomic response handling

**Finding:** the response endpoint accepts any recognized target status. Response insert, issue update, audit, and notifications are separate operations.

**Evidence:** `app/api/admin/issues/[id]/responses/route.ts`, `lib/issue-response-policy.ts`.

**Risk:** invalid state jumps and partial updates (for example, response saved but issue status/audit not updated).

**Recommended transition graph:**

```text
pending → reviewing → resolved → closed
pending → closed       (invalid/out-of-scope, reason required)
reviewing → pending    (return for clarification, reason required)
resolved → reviewing   (reopened, reason required)
```

Finalize the actual graph with BAFE operations. Enforce it server-side and commit response, status, public-description publication, resolution timestamp, audit, and outbox event in one transaction.

### P1.7 Add publication/visibility governance to knowledge retrieval

**Finding:** active embedded KB documents have archive state but no explicit draft/published status or public/authenticated/admin visibility. Public chat searches eligible embedded documents.

**Evidence:** `kb_documents` schema, `lib/kb-search.ts`, `lib/chat-tools.ts`.

**Risk:** an uploaded internal document may become searchable by public chat before formal publication approval.

**Recommended change:** add draft/review/published/archived lifecycle, visibility, canonical source URL, version, approver, and publication timestamps. Enforce visibility inside the retrieval query, not only in prompts.

### P1.8 Eliminate silent ephemeral upload success

**Finding:** selected MinIO network failures fall back to local `.storage` and return success.

**Evidence:** `lib/minio.ts`.

**Risk:** uploads disappear on restart/redeploy or differ across replicas while the database keeps apparently valid paths.

**Recommended change:** fail closed in production unless a durable alternative is explicitly configured. Surface storage health and retry safely. Keep a local fallback only for development/test mode.

### P1.9 Add abuse controls to public write surfaces

**Finding:** there is no confirmed repository-wide limiter for public issue/contact submission; older security documentation claims broader controls than current code provides.

**Affected surfaces:** E-Report creation, contact form, auth OTP endpoints, uploads, comments/votes, and any future anonymous analytics/survey endpoint.

**Recommended change:** first-party rate limits with trusted proxy configuration, request-size limits, spam controls, duplicate detection, and privacy-safe abuse keys. Do not retain raw IP/user-agent as general product analytics.

### P1.10 Remove runtime/user uploads from source control

**Finding:** uploaded PDF/image files are present under `.storage` in the repository working tree.

**Risk:** sensitive/runtime data can enter Git history and deployments.

**Recommended change:** ensure `.storage/**` is ignored except safe placeholders, move approved fixtures to explicit test-fixture paths, and review repository history before public sharing.

## 3. P2 workflow and governance improvements

### P2.1 Align documentation with executable behavior

Current older docs incorrectly or prematurely claim several components, versions, roles, and infrastructure services.

Recommended action:

- Make `docs/current-system/README.md` the current-code entry point.
- Add a status banner to older architecture/feature/API/security documents.
- Update docs only when code and deployment verification support the claim.
- Generate route/API inventories in CI to detect drift.

### P2.2 Normalize moderator scope

**Finding:** region and program scope use free-text source values; `assignedAgency` is actually matched to `projects.program`.

Recommended action:

- Rename the concept to `assignedProgram` after a migration or explicitly model agency and program separately.
- Use stable source IDs/codes rather than display strings.
- Clear/review obsolete scope assignments when a role changes.
- Add authorization tests for region-only, program-only, combined, missing, and renamed values.

### P2.3 Replace destructive moderation with retention-aware archive where appropriate

Feedback and issues can be permanently deleted through normal moderation screens.

Recommended action:

- Define legal/operational deletion rules.
- Prefer archive/soft-delete for records needed for accountability.
- Reserve permanent deletion for approved privacy/retention cases.
- Add reason, approver, timestamp, evidence cleanup, and audit handling.

### P2.4 Constrain workflow/status fields at the database boundary

Several states and domain references are text values without database checks or foreign keys.

Recommended action: add reviewed enums/check constraints, foreign keys where appropriate, and migrations with rollback/validation. Keep external source strings separate from internal normalized states.

### P2.5 Remove runtime DDL

`ensureIssueResponsesTable()` and audit helpers can create/alter tables at runtime despite tracked migrations.

Recommended action: make migrations the only production schema-changing path and use readiness checks to refuse startup when required migrations are absent.

### P2.6 Complete geospatial provisioning

The schema uses `geometry(Point,4326)`, but migrations do not clearly create PostGIS or a GIST index.

Recommended action: add an explicit reversible extension/index migration, verify production PostgreSQL support, and keep current source-backed coordinate validation.

### P2.7 Strengthen service health and observability

Current Docker health checks only the root page.

Recommended action:

- Add separate liveness and authorized/internal readiness endpoints.
- Readiness should validate database connectivity/migration version and optionally storage/critical job health without exposing secrets.
- Monitor ABEMIS freshness, failed syncs, queue backlog, notification failures, upload failures, AI latency/error rates, and disk/storage availability.
- Add alert ownership/runbooks.

### P2.8 Add backup and restore evidence

No tracked automated backup/restore implementation or CI workflow was found.

Recommended action: document PostgreSQL/MinIO backup schedules, encryption, retention, off-host storage, and recovery objectives; perform and record restoration tests in a non-production environment.

### P2.9 Clarify public anonymity

Use explicit wording such as:

> Your name is hidden from public viewers. Authorized moderators can still identify the account that submitted this feedback for moderation and abuse handling.

Apply consistent wording to feedback, E-Report, privacy notice, and deletion policy.

### P2.10 Define contact-message operations

The permission model includes contact-message management, but no current administration route was found.

Recommended action: verify persistence, add an authorized queue with status/assignment/retention if contact is operational, or remove claims that messages are managed in-system.

### P2.11 Verify uploaded live-video asset cleanup

Make delete/update behavior explicit for old recorded-video and thumbnail objects. Prevent orphaned storage while retaining assets required by audit/retention policy.

### P2.12 Add explicit download delivery and analytics boundaries

If reports/documents need download counts, serve them through stable resource IDs and record successful authorized delivery—not just button clicks. Do not conflate security logs, object-server access logs, or browser events with approved audience analytics.

## 4. P3 product opportunities

### P3.1 Audience Activity and Demographic Analytics

Build only after approving purpose, consent, retention, access, and small-cohort reporting rules. See the dedicated analytics design document.

Candidate first-party activity events:

- `page_viewed`
- `project_searched`
- `project_filters_applied`
- `project_viewed`
- `map_viewed`
- `map_project_opened`
- `document_download_completed`
- `report_started`
- `report_submitted`
- `feedback_started`
- `feedback_submitted`

Age and gender must be optional, self-declared, and separately consented. They cannot be inferred from the above events.

### P3.2 Better operational work queues

- Separate “needs action” from full history.
- Add assignment, due state, stale-state highlighting, and scoped bulk export.
- Do not add bulk destructive actions without recovery and authorization design.

### P3.3 Source reconciliation dashboard

Provide read-only comparisons for ABEMIS identity changes, coordinate changes, budget/progress changes, and failed rows before publishing risky source changes. Preserve immutable project identity.

### P3.4 Data-quality follow-up lifecycle

Keep project records read-only in InfraWatch, but add non-destructive follow-up metadata:

- finding status (`new`, `sent_to_source_owner`, `acknowledged`, `resolved_in_source`)
- owner/team
- note and source ticket reference
- verification after next sync

This tracks recommendations without editing ABEMIS-derived project values.

### P3.5 Evaluate local/open-source AI path

Current text generation supports cloud providers while embeddings/voice can be local. A future local text-generation option can be evaluated against accuracy, Filipino support, latency, resource use, and authorization leakage tests before adoption.

## 5. Proposed delivery sequence

### Phase 0 — Containment

1. Disable or secure unauthenticated KB processing.
2. Make KB/evidence storage private.
3. Stop exposing unverified financial-progress semantics.
4. Prevent ABEMIS identity correction from deleting dependent data.
5. Remove runtime uploads from Git tracking/history as appropriate.

### Phase 1 — Transactional safety and delivery reliability

1. Issue transition graph and transaction/outbox.
2. Durable scheduler leases and sync overlap protection.
3. Retryable email/SMS/notification delivery.
4. Production verification/reset delivery.
5. Production storage fail-closed behavior.

### Phase 2 — Privacy and governance

1. Image metadata stripping.
2. KB publication/visibility workflow.
3. Retention/deletion policy and archival flows.
4. Moderator scope normalization.
5. Privacy notice alignment with actual identifiers and anonymous-mode behavior.

### Phase 3 — Operations and quality

1. Readiness/metrics/alerts.
2. Backup/restore drills.
3. PostGIS migration/indexing.
4. Remove runtime DDL.
5. Documentation/route drift checks.

### Phase 4 — New analytics and product enhancements

1. Approve audience-analytics purpose and data governance.
2. Implement first-party activity events without demographics.
3. Validate event quality and bot/internal-traffic exclusion.
4. Add optional consented age bands/gender/audience type only if justified.
5. Release aggregate-only demographic reporting with suppression thresholds.

## 6. Acceptance checks for enhancement work

Every implemented enhancement should include:

- Server-side authorization tests, including moderator scope
- Migration and rollback plan for schema changes
- Privacy and retention review for new fields/events
- Failure/retry/idempotency tests for background work
- Audit behavior for administrative mutations
- TypeScript, focused tests, lint, and `git diff --check`
- Production build
- Responsive browser verification for changed UI
- Deployment dependency and rollback documentation
- Proof from the running target environment before claiming production availability

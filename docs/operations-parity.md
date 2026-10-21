# Account and operations features

InfraWatch now includes the account, moderation, contact reporting, location, storage, and regional reporting capabilities identified in the FMR Watch comparison. MIADP integration is excluded. ABEMIS remains the project source.

## Deploy

1. Back up the database and apply migrations with `bunx drizzle-kit migrate` before starting the updated application. Migrations `0037_operations_parity.sql` and `0038_comment_votes.sql` are additive. The first migration upgrades an existing legacy `feedback_comments` table and preserves existing comments as published.
2. Run a persistent Node server. Set `ENABLE_BACKGROUND_WORKER=true` for development or keep its production default enabled. Set `ENABLE_SCHEDULER=true` where scheduled ABEMIS synchronization is required. Jobs persist in PostgreSQL; an in-memory-only or request-only runtime cannot reliably process them.
3. Install both `ffmpeg` and `ffprobe`. The production Docker image includes them. Override `FFMPEG_PATH` and `FFPROBE_PATH` when they are outside the process PATH.
4. Set `BETTER_AUTH_URL` to the browser origin and keep separate public and private MinIO buckets configured. The browser must reach the host in presigned storage URLs. Allow that origin to send PUT requests, allow the Content-Type request header, and expose the ETag response header in storage CORS. Bucket CORS is reconciled where supported; MinIO versions returning NotImplemented require server-level CORS configuration.
5. Optionally set `REDIS_URL` in `.env.production`. The supplied production Compose file can start Redis with `docker compose --env-file .env.production -f docker-compose.production.yml --profile cache up -d`. Set `REDIS_URL=redis://cache:6379` when using that profile. Keep Redis on the private network.
6. Open **System → Service health** as an administrator. Confirm database, both storage buckets, video frame processing, and the worker setting. Redis appears as not configured until its URL is supplied.

See [.env.production.example](../.env.production.example) for configuration names. Email and SMS channels also require the existing mail and SMS transport configuration.

## Use

| Feature | Entry point | Access and behavior |
| --- | --- | --- |
| Password and notification channels | `/account-settings` | Signed-in users change their own password and preferences. Password changes revoke other sessions. External-provider accounts manage their password with the provider. SMS requires a saved phone number. Existing accounts default to in-app notifications only. Verification codes and submission receipts are separate. |
| Comment moderation | `/comment-moderation` | Staff review comments within their assigned project scope. Publish/reject requires a reason and checks the comment revision to prevent stale decisions. Only published comments on approved feedback are public. Authors can edit/delete their own comments; edits trigger moderation again. Votes are stored per account. |
| Contact replies | `/contact-messages` | Authorized staff send email replies and see persisted sending, sent, and failed attempts. A response UUID prevents a duplicate send on repeated submission. |
| Contact SLA | `/reports/contact` | Administrators and regional administrators inspect response times for the selected dates. The first successfully sent reply counts as response; changing a workflow status alone does not. The response target is 72 hours. Resolution is measured separately. |
| Project synchronization | `/sync` | Administrators queue ABEMIS jobs, follow streamed progress, inspect history, and retry failures. |
| Location synchronization | `/locations/sync` | Administrators queue PSGC synchronization and inspect imported counts and source history. |
| Regional statistics | `/regional-statistics` | Administrators enter cited figures for each region, program, and funding year, and explicitly publish them. `/statistics` displays published records only. Zero is an observed zero; a blank measure is unavailable. These figures do not replace live portfolio analytics. |
| Commodity overrides | `/admin-projects` | Staff with project update permission edit commodities within their assigned scope and record a reason. Source synchronization retains local overrides and updates the saved source baseline. Restore source values uses that newest baseline. |
| Project exports | `/projects` | CSV and PDF use the directory's selected public filters and a fixed public field list. Exports are limited to 30,000 matching projects; narrow filters for larger selections. |
| Large recordings | Existing live video editor | Video managers upload MP4, MOV, and WebM recordings up to 20 GB directly to private object storage, with progress, cancellation, and up to three attempts per part. Files at least 100 MB use 50 MB multipart chunks. Validated completed uploads are copied to public recording storage. |
| Cache management | `/health-check` | Administrators clear this instance's public cache. Redis caches map layers and published regional figures, with a bounded local fallback when Redis is unavailable. |

## Background processing and recovery

Jobs use atomic database claims, two-minute leases, a heartbeat every 20 seconds, and token checks before progress or settlement. A process restart allows another worker to reclaim an expired lease. Failures retry with backoff, up to the configured attempt limit. ABEMIS and location jobs are deduplicated while active. Notification deliveries retain per-recipient checkpoints and recheck current channel preferences before sending.

External email and SMS delivery is at least once: a crash after the provider accepts a message but before its checkpoint is stored can produce a duplicate on retry. Do not treat job completion as a provider delivery receipt. Contact replies left in sending state after an interrupted send require staff to check delivery before resubmitting; failed attempts remain in history.

Media comments stay pending until review completes. Automated video review samples eight frames across the recording using ffmpeg; it is a screening aid, not a frame-by-frame guarantee. Failed processing retries and leaves the comment available for staff review. Recordings over the automated review limit of 512 MB require staff review. Manual decisions and author edits invalidate older moderation work by revision.

Incomplete direct uploads expire after 24 hours. Completion reserves up to two hours for storage validation/copying. The worker checks expired upload sessions once a minute, removes abandoned staging parts and incomplete copies, and retries failed cleanup after an hour. Successfully completed recordings are excluded from cleanup. A browser or server interruption may require starting the upload again. A maximum of three active upload sessions per account limits abandoned work.

## Verification

Run the focused database checks against a local development database only:

```powershell
$env:RUN_OPERATIONS_DB_TESTS='1'
bun --env-file=.env.local --conditions=react-server test lib/operations.integration.test.ts --timeout 30000
Remove-Item Env:RUN_OPERATIONS_DB_TESTS
```

The tests create isolated fixtures and remove them afterward. They cover job deduplication and lease recovery, account channel isolation, scoped commodity overrides across a real source upsert/reset, comment revision conflicts, draft regional records, and recording ownership/validation/completion with a mocked storage transport. The default suite skips database fixture tests.

For a release, also run `bun test --timeout 30000`, `bunx tsc --noEmit`, `bun run lint --quiet`, `bun run build`, and `git diff --check`. Review the new pages at desktop and phone widths. Verify a real presigned upload in the deployment environment because browser-to-storage networking and CORS depend on its configuration.

To roll back application code, stop workers and restore the previous image. Keep the additive tables and columns until a deliberate data-retention decision; deleting them discards preferences, reply history, moderation state, jobs, and commodity baselines.

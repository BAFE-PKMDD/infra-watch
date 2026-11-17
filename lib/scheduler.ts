/**
 * Scheduler Module
 * Handles automatic scheduled tasks using node-cron
 */

import cron from "node-cron";
import { hasRecentSuccessfulSync } from "./abemis/sync";
import { enqueueJob } from "./background-jobs";
import { purgeExpiredChatHistory } from "./chat-history";
import { runSlaFollowUpReminders } from "./sla-followup";
import { runCitizenAnalyticsMaintenance } from "./analytics/citizen-analytics-maintenance";
import { runScheduledSmsAcknowledgments, runScheduledSmsAutoLink } from "./sms-grievance/auto-acknowledge";

let isSchedulerInitialized = false;

// The sync runs every 3 hours. A scheduled run is skipped only if a sync (for example one
// started by hand) already finished in the last 2 hours, so the 3-hour rhythm is kept
// without running twice back to back.
const SKIP_IF_SYNCED_WITHIN_HOURS = 2;

/**
 * Initialize the scheduler
 * Sets up cron jobs for automated tasks
 */
export function initScheduler() {
  if (isSchedulerInitialized) {
    console.log("[Scheduler] Already initialized, skipping.");
    return;
  }

  const enableScheduler =
    process.env.ENABLE_SCHEDULER === "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.ENABLE_SCHEDULER !== "false");

  if (!enableScheduler) {
    console.log("[Scheduler] Disabled (set ENABLE_SCHEDULER=true to enable).");
    return;
  }

  // Runs every 3 hours so the portal data stays fresh. ABEMIS's upstream server has shown
  // recurring outages (HTTP 526), so a failed sync is retried one hour later by the
  // background worker (3 attempts), and the administrator is emailed if all 3 fail.
  const cronSchedule = process.env.SYNC_CRON_SCHEDULE || "0 */3 * * *";

  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    console.error(`[Scheduler] Invalid cron expression: ${cronSchedule}`);
    return;
  }

  console.log(`[Scheduler] Initializing ABEMIS sync cron job with schedule: ${cronSchedule}`);

  // Schedule ABEMIS sync
  cron.schedule(
    cronSchedule,
    async () => {
      if (await hasRecentSuccessfulSync(SKIP_IF_SYNCED_WITHIN_HOURS)) {
        console.log(`[Scheduler] Skipping ABEMIS sync; a sync already completed within the last ${SKIP_IF_SYNCED_WITHIN_HOURS} hours.`);
        return;
      }

      console.log("[Scheduler] Starting scheduled ABEMIS sync...");

      try {
        const job = await enqueueJob("abemis-sync", "cron-scheduler", { syncType: "scheduled" });
        console.log("[Scheduler] Queued ABEMIS synchronization", { jobId: job.id });
      } catch (error) {
        console.error(
          "[Scheduler] Scheduled ABEMIS sync failed to execute:",
          error instanceof Error ? error.message : String(error)
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "abemis-sync",
    }
  );

  cron.schedule(
    "15 3 * * *",
    async () => {
      try {
        const deleted = await purgeExpiredChatHistory();
        console.log(`[Scheduler] Deleted ${deleted} expired AI chat history records.`);
      } catch (error) {
        console.error(
          "[Scheduler] AI chat history retention cleanup failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "ai-chat-history-retention",
    },
  );

  cron.schedule(
    "30 3 * * *",
    async () => {
      try {
        await runCitizenAnalyticsMaintenance();
        console.log("[Scheduler] Citizen analytics retention maintenance completed.");
      } catch (error) {
        console.error(
          "[Scheduler] Citizen analytics retention maintenance failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "citizen-analytics-retention",
    },
  );

  // The 5-minute-delayed feedback auto-acknowledgment sweep (lib/feedback-auto-acknowledgment.ts)
  // was retired here: feedback acknowledgment now happens instantly at submission time via the
  // auto-accept toggle in /settings (see app/api/projects/[id]/feedback/route.ts), which also
  // approves the feedback rather than just sending a courtesy notification. The old function is
  // left in place, unscheduled, rather than deleted.

  // Runs every 15 minutes — the reminder checkpoints are hour-scale (24h/60h/72h), so
  // minute-level precision isn't needed the way it is for the 5-minute auto-acknowledgment.
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        const result = await runSlaFollowUpReminders();
        const total = result.feedback.gentle + result.feedback.urgent + result.feedback.breach
          + result.issues.gentle + result.issues.urgent + result.issues.breach;
        if (total > 0) {
          console.log(
            `[Scheduler] Sent SLA follow-up reminders — feedback: ${JSON.stringify(result.feedback)}, issues: ${JSON.stringify(result.issues)}.`,
          );
        }
      } catch (error) {
        console.error(
          "[Scheduler] SLA follow-up run failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "sla-followup-reminders",
    },
  );

  // Texts a first reply to each newly received SMS grievance. A no-op unless
  // SMS_AUTO_ACK_ENABLED=true (and SMS_AUTO_ACK_SINCE is set), so merely turning the
  // scheduler on never starts messaging people.
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        // Link first so a follow-up text joins its existing case instead of being
        // acknowledged as a brand-new report.
        const linkResult = await runScheduledSmsAutoLink();
        if (linkResult && (linkResult.linked > 0 || linkResult.failed > 0)) {
          console.log(`[Scheduler] SMS auto-link — linked ${linkResult.linked}, failed ${linkResult.failed}.`);
        }
        const result = await runScheduledSmsAcknowledgments();
        if (result?.skippedReason && result.skippedReason !== "disabled") {
          console.warn(`[Scheduler] SMS auto-acknowledgment skipped: ${result.skippedReason}.`);
        } else if (result && (result.acknowledged > 0 || result.failed > 0)) {
          console.log(`[Scheduler] SMS auto-acknowledgments — sent ${result.acknowledged}, failed ${result.failed}.`);
        }
      } catch (error) {
        console.error(
          "[Scheduler] SMS auto-acknowledgment run failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "sms-grievance-auto-acknowledgment",
    },
  );

  isSchedulerInitialized = true;
  console.log(`[Scheduler] Initialization complete - ABEMIS sync scheduled for: ${cronSchedule}`);
}

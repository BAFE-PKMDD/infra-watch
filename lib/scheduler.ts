/**
 * Scheduler Module
 * Handles automatic scheduled tasks using node-cron
 */

import cron from "node-cron";
import { hasRecentSuccessfulSync, syncAbemisProjects } from "./abemis/sync";
import { purgeExpiredChatHistory } from "./chat-history";
import { runFeedbackAutoAcknowledgment } from "./feedback-auto-acknowledgment";
import { runSlaFollowUpReminders } from "./sla-followup";

let isSchedulerInitialized = false;

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

  // Runs every 3 hours rather than once nightly: ABEMIS's upstream server has shown
  // recurring outages (HTTP 526) at a fixed hour, so a single daily attempt can miss
  // an entire day. Each tick skips if a sync already succeeded recently, so a healthy
  // day still only hits ABEMIS once.
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
      if (await hasRecentSuccessfulSync()) {
        console.log("[Scheduler] Skipping ABEMIS sync; a sync already completed within the last 20 hours.");
        return;
      }

      console.log("[Scheduler] Starting scheduled ABEMIS sync...");

      try {
        const result = await syncAbemisProjects({
          syncType: "scheduled",
          triggeredBy: "cron-scheduler",
        });

        if (result.success) {
          console.log(
            `[Scheduler] ABEMIS sync completed successfully in ${result.duration}ms. Added ${result.statistics.projectsAdded}, updated ${result.statistics.projectsUpdated}, failed ${result.statistics.projectsFailed}.`
          );
        } else {
          console.error(
            `[Scheduler] ABEMIS sync completed with errors.`,
            JSON.stringify(result.errors, null, 2)
          );
        }
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

  // Runs every minute so a 5-minute-old pending feedback is caught within a minute of
  // crossing the threshold, without needing a per-submission timer that wouldn't survive
  // a restart.
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const count = await runFeedbackAutoAcknowledgment();
        if (count > 0) {
          console.log(`[Scheduler] Sent ${count} automatic feedback acknowledgment(s).`);
        }
      } catch (error) {
        console.error(
          "[Scheduler] Feedback auto-acknowledgment run failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    {
      timezone: "Asia/Manila",
      name: "feedback-auto-acknowledgment",
    },
  );

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

  isSchedulerInitialized = true;
  console.log(`[Scheduler] Initialization complete - ABEMIS sync scheduled for: ${cronSchedule}`);
}

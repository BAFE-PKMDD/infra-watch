/**
 * Scheduler Module
 * Handles automatic scheduled tasks using node-cron
 */

import cron from "node-cron";
import { syncAbemisProjects } from "./abemis/sync";

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

  const cronSchedule = process.env.SYNC_CRON_SCHEDULE || "0 2 * * *";

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

  isSchedulerInitialized = true;
  console.log(`[Scheduler] Initialization complete - ABEMIS sync scheduled for: ${cronSchedule}`);
}

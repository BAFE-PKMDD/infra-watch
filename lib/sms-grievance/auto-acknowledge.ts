import { sendSMS } from "@/lib/sms";
import { fetchLiveSmsGrievanceRecords } from "@/lib/sms-grievance/live-source";
import { readAutoAcknowledgeOptions, runSmsAutoAcknowledgments } from "@/lib/sms-grievance/live-review";
import { drizzleSmsReviewStore } from "@/lib/sms-grievance/review-store";

let running = false;

// Entry point for the scheduler (lib/scheduler.ts). Does nothing unless
// SMS_AUTO_ACK_ENABLED=true and SMS_AUTO_ACK_SINCE names the instant from which new
// messages should be acknowledged.
export async function runScheduledSmsAcknowledgments() {
  const options = readAutoAcknowledgeOptions();
  if (!options.enabled || running) return null;

  running = true;
  try {
    return await runSmsAutoAcknowledgments(
      { store: drizzleSmsReviewStore, send: sendSMS, listLive: fetchLiveSmsGrievanceRecords },
      options,
    );
  } finally {
    running = false;
  }
}

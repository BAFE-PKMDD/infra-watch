import { and, eq, isNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import {
  FEEDBACK_AUTO_ACK_DELAY_MINUTES,
  FEEDBACK_AUTO_ACKNOWLEDGMENT_MESSAGE,
} from "@/lib/feedback-auto-acknowledgment-message";
import { publishAndPersistNotification } from "@/lib/notification-persistence";

/**
 * Sends the canned "we've logged your report" acknowledgment to feedback that has sat in
 * "pending" for FEEDBACK_AUTO_ACK_DELAY_MINUTES with no human moderator action yet.
 *
 * Only ever sets `autoAcknowledgedAt` — never `status` or `moderationNote` — so this can't
 * masquerade as a real moderation decision. A row already approved/rejected by the time
 * this runs is skipped: a real moderator response takes precedence over the canned one.
 */
export async function runFeedbackAutoAcknowledgment(now: Date = new Date()) {
  const threshold = new Date(now.getTime() - FEEDBACK_AUTO_ACK_DELAY_MINUTES * 60_000);

  const acknowledged = await db
    .update(feedback)
    .set({ autoAcknowledgedAt: now })
    .where(
      and(
        isNull(feedback.autoAcknowledgedAt),
        eq(feedback.status, "pending"),
        lte(feedback.createdAt, threshold),
      ),
    )
    .returning({ id: feedback.id, userId: feedback.userId, projectId: feedback.projectId });

  for (const row of acknowledged) {
    if (!row.userId) continue;

    try {
      await publishAndPersistNotification(
        {
          type: "feedback_auto_acknowledged",
          title: "We received your feedback",
          message: FEEDBACK_AUTO_ACKNOWLEDGMENT_MESSAGE,
          metadata: { feedbackId: row.id, projectId: row.projectId },
        },
        [row.userId],
      );
    } catch (error) {
      console.error("Failed to persist feedback auto-acknowledgment notification", {
        feedbackId: row.id,
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return acknowledged.length;
}

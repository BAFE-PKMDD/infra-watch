import { and, eq, exists, inArray, isNull, lte, not } from "drizzle-orm";

import { user } from "@/auth-schema";
import { db } from "@/lib/db";
import { feedback, issueResponses, issues } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { publishAndPersistNotification } from "@/lib/notification-persistence";
import { sendSMS } from "@/lib/sms";
import {
  SLA_BREACH_HOURS,
  SLA_GENTLE_REMINDER_HOURS,
  SLA_URGENT_REMINDER_HOURS,
} from "@/lib/sla-thresholds";
import {
  getIssueFollowUpRecipients,
  getProjectFollowUpRecipients,
} from "@/lib/staff-notification-recipients";

const HOUR_MS = 60 * 60 * 1000;
const SMS_MESSAGE_MAX_LENGTH = 150;

function toSmsText(title: string, message: string) {
  const combined = `${title}: ${message}`;
  return combined.length > SMS_MESSAGE_MAX_LENGTH ? `${combined.slice(0, SMS_MESSAGE_MAX_LENGTH - 1)}…` : combined;
}

// Single seam for every SLA follow-up notification: in-app (DB + SSE), email, and SMS.
// SMS only reaches recipients who have set a phone number on their profile (My Profile);
// everyone else still gets the in-app + email channels.
async function notify(
  recipientIds: string[],
  input: { type: string; title: string; message: string; metadata: Record<string, unknown> },
  context: Record<string, unknown>,
) {
  if (recipientIds.length === 0) return;

  try {
    await publishAndPersistNotification(input, recipientIds);
  } catch (error) {
    console.error("Failed to persist SLA follow-up notification", {
      ...context,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  const recipients = await db
    .select({ id: user.id, email: user.email, phoneNumber: user.phoneNumber })
    .from(user)
    .where(inArray(user.id, recipientIds));

  await Promise.all(
    recipients.map(async (recipient) => {
      const emailResult = await sendEmail({ to: recipient.email, subject: input.title, text: input.message });
      if (!emailResult.success) {
        console.error("Failed to send SLA follow-up email", { ...context, userId: recipient.id, error: emailResult.error });
      }

      if (!recipient.phoneNumber) return;
      const smsResult = await sendSMS(recipient.phoneNumber, toSmsText(input.title, input.message));
      if (!smsResult.success) {
        console.error("Failed to send SLA follow-up SMS", { ...context, userId: recipient.id, error: smsResult.error });
      }
    }),
  );
}

function excerpt(text: string | null, length = 60) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "(no comment)";
  return trimmed.length > length ? `${trimmed.slice(0, length)}…` : trimmed;
}

async function runFeedbackFollowUp(now: Date) {
  const gentleThreshold = new Date(now.getTime() - SLA_GENTLE_REMINDER_HOURS * HOUR_MS);
  const urgentThreshold = new Date(now.getTime() - SLA_URGENT_REMINDER_HOURS * HOUR_MS);
  const breachThreshold = new Date(now.getTime() - SLA_BREACH_HOURS * HOUR_MS);

  const gentleRows = await db
    .update(feedback)
    .set({ slaGentleReminderAt: now })
    .where(and(eq(feedback.status, "pending"), isNull(feedback.slaGentleReminderAt), lte(feedback.createdAt, gentleThreshold)))
    .returning({ id: feedback.id, projectId: feedback.projectId, comment: feedback.comment });

  for (const row of gentleRows) {
    const recipients = await getProjectFollowUpRecipients(row.projectId);
    await notify(
      recipients.moderatorIds,
      {
        type: "feedback_sla_reminder",
        title: "Feedback awaiting moderation",
        message: `"${excerpt(row.comment)}" has been pending for ${SLA_GENTLE_REMINDER_HOURS}+ hours.`,
        metadata: { feedbackId: row.id, projectId: row.projectId, checkpoint: "gentle" },
      },
      { feedbackId: row.id, checkpoint: "gentle" },
    );
  }

  const urgentRows = await db
    .update(feedback)
    .set({ slaUrgentReminderAt: now })
    .where(and(eq(feedback.status, "pending"), isNull(feedback.slaUrgentReminderAt), lte(feedback.createdAt, urgentThreshold)))
    .returning({ id: feedback.id, projectId: feedback.projectId, comment: feedback.comment });

  for (const row of urgentRows) {
    const recipients = await getProjectFollowUpRecipients(row.projectId);
    await notify(
      [...recipients.moderatorIds, ...recipients.adminIds],
      {
        type: "feedback_sla_urgent",
        title: "Feedback nearing SLA breach",
        message: `"${excerpt(row.comment)}" has been pending for ${SLA_URGENT_REMINDER_HOURS}+ hours and will breach the ${SLA_BREACH_HOURS}-hour SLA soon.`,
        metadata: { feedbackId: row.id, projectId: row.projectId, checkpoint: "urgent" },
      },
      { feedbackId: row.id, checkpoint: "urgent" },
    );
  }

  const breachRows = await db
    .update(feedback)
    .set({ slaBreachNotifiedAt: now })
    .where(and(eq(feedback.status, "pending"), isNull(feedback.slaBreachNotifiedAt), lte(feedback.createdAt, breachThreshold)))
    .returning({ id: feedback.id, projectId: feedback.projectId, comment: feedback.comment });

  for (const row of breachRows) {
    const recipients = await getProjectFollowUpRecipients(row.projectId);
    await notify(
      recipients.adminIds,
      {
        type: "feedback_sla_breach",
        title: "Feedback SLA breached",
        message: `"${excerpt(row.comment)}" has exceeded the ${SLA_BREACH_HOURS}-hour SLA with no moderation decision.`,
        metadata: { feedbackId: row.id, projectId: row.projectId, checkpoint: "breach" },
      },
      { feedbackId: row.id, checkpoint: "breach" },
    );
  }

  return { gentle: gentleRows.length, urgent: urgentRows.length, breach: breachRows.length };
}

async function runIssueFollowUp(now: Date) {
  const gentleThreshold = new Date(now.getTime() - SLA_GENTLE_REMINDER_HOURS * HOUR_MS);
  const urgentThreshold = new Date(now.getTime() - SLA_URGENT_REMINDER_HOURS * HOUR_MS);
  const breachThreshold = new Date(now.getTime() - SLA_BREACH_HOURS * HOUR_MS);

  // Same definition of "responded" as the SLA report: the first response the reporter
  // actually saw, not an internal-only staff note.
  const hasPublicResponse = exists(
    db
      .select({ id: issueResponses.id })
      .from(issueResponses)
      .where(and(eq(issueResponses.issueId, issues.id), eq(issueResponses.isInternalOnly, false))),
  );

  const gentleRows = await db
    .update(issues)
    .set({ slaGentleReminderAt: now })
    .where(and(isNull(issues.slaGentleReminderAt), lte(issues.createdAt, gentleThreshold), not(hasPublicResponse)))
    .returning({ id: issues.id, ticketNumber: issues.ticketNumber, region: issues.region, projectId: issues.projectId });

  for (const row of gentleRows) {
    const recipients = await getIssueFollowUpRecipients(row);
    await notify(
      recipients.moderatorIds,
      {
        type: "issue_sla_reminder",
        title: "Issue awaiting a response",
        message: `Issue ${row.ticketNumber} has had no public response for ${SLA_GENTLE_REMINDER_HOURS}+ hours.`,
        metadata: { issueId: row.id, ticketNumber: row.ticketNumber, checkpoint: "gentle" },
      },
      { issueId: row.id, checkpoint: "gentle" },
    );
  }

  const urgentRows = await db
    .update(issues)
    .set({ slaUrgentReminderAt: now })
    .where(and(isNull(issues.slaUrgentReminderAt), lte(issues.createdAt, urgentThreshold), not(hasPublicResponse)))
    .returning({ id: issues.id, ticketNumber: issues.ticketNumber, region: issues.region, projectId: issues.projectId });

  for (const row of urgentRows) {
    const recipients = await getIssueFollowUpRecipients(row);
    await notify(
      [...recipients.moderatorIds, ...recipients.adminIds],
      {
        type: "issue_sla_urgent",
        title: "Issue nearing SLA breach",
        message: `Issue ${row.ticketNumber} has had no public response for ${SLA_URGENT_REMINDER_HOURS}+ hours and will breach the ${SLA_BREACH_HOURS}-hour SLA soon.`,
        metadata: { issueId: row.id, ticketNumber: row.ticketNumber, checkpoint: "urgent" },
      },
      { issueId: row.id, checkpoint: "urgent" },
    );
  }

  const breachRows = await db
    .update(issues)
    .set({ slaBreachNotifiedAt: now })
    .where(and(isNull(issues.slaBreachNotifiedAt), lte(issues.createdAt, breachThreshold), not(hasPublicResponse)))
    .returning({ id: issues.id, ticketNumber: issues.ticketNumber, region: issues.region, projectId: issues.projectId });

  for (const row of breachRows) {
    const recipients = await getIssueFollowUpRecipients(row);
    await notify(
      recipients.adminIds,
      {
        type: "issue_sla_breach",
        title: "Issue SLA breached",
        message: `Issue ${row.ticketNumber} has exceeded the ${SLA_BREACH_HOURS}-hour SLA with no public response.`,
        metadata: { issueId: row.id, ticketNumber: row.ticketNumber, checkpoint: "breach" },
      },
      { issueId: row.id, checkpoint: "breach" },
    );
  }

  return { gentle: gentleRows.length, urgent: urgentRows.length, breach: breachRows.length };
}

export async function runSlaFollowUpReminders(now: Date = new Date()) {
  const [feedbackCounts, issueCounts] = await Promise.all([
    runFeedbackFollowUp(now),
    runIssueFollowUp(now),
  ]);

  return { feedback: feedbackCounts, issues: issueCounts };
}

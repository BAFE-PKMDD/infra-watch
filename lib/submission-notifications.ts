import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback, issues, notificationRecipients, notifications } from "@/lib/db/schema";
import { broadcastNotificationRemoval } from "@/lib/realtime-notifications";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type SubmissionTarget =
  | { kind: "feedback"; id: string }
  | { kind: "issue"; id: string; ticketNumber?: string };

export function submissionNotificationCondition(target: SubmissionTarget): SQL {
  const directKey = target.kind === "feedback" ? "feedbackId" : "issueId";
  return or(
    sql`${notifications.metadata}->>${directKey} = ${target.id}`,
    and(
      sql`${notifications.metadata}->>'postType' = ${target.kind}`,
      sql`${notifications.metadata}->>'postId' = ${target.id}`,
    ),
    target.kind === "issue" && target.ticketNumber
      ? sql`${notifications.metadata}->>'ticketNumber' = ${target.ticketNumber} AND left(${notifications.type}, 6) = 'issue_'`
      : undefined,
  )!;
}

const orphanedSubmissionCondition = sql`(
  (${notifications.metadata}->>'feedbackId' <> '' AND NOT EXISTS (
    SELECT 1 FROM ${feedback} WHERE ${feedback.id}::text = ${notifications.metadata}->>'feedbackId'
  )) OR
  (${notifications.metadata}->>'issueId' <> '' AND NOT EXISTS (
    SELECT 1 FROM ${issues} WHERE ${issues.id}::text = ${notifications.metadata}->>'issueId'
  )) OR
  (${notifications.metadata}->>'postType' = 'feedback' AND ${notifications.metadata}->>'postId' <> '' AND NOT EXISTS (
    SELECT 1 FROM ${feedback} WHERE ${feedback.id}::text = ${notifications.metadata}->>'postId'
  )) OR
  (${notifications.metadata}->>'postType' = 'issue' AND ${notifications.metadata}->>'postId' <> '' AND NOT EXISTS (
    SELECT 1 FROM ${issues} WHERE ${issues.id}::text = ${notifications.metadata}->>'postId'
  )) OR
  (left(${notifications.type}, 6) = 'issue_' AND ${notifications.metadata}->>'ticketNumber' <> ''
    AND COALESCE(${notifications.metadata}->>'issueId', '') = '' AND NOT EXISTS (
      SELECT 1 FROM ${issues} WHERE ${issues.ticketNumber} = ${notifications.metadata}->>'ticketNumber'
  ))
)`;

async function removeMatchingNotifications(tx: Transaction, condition: SQL) {
  const removals = await tx
    .select({ userId: notificationRecipients.userId, notificationId: notificationRecipients.notificationId })
    .from(notificationRecipients)
    .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
    .where(condition);
  // The notification_recipients foreign key cascades read state and inbox entries.
  await tx.delete(notifications).where(condition);
  return removals;
}

export async function deleteSubmissionAndNotifications(tx: Transaction, target: SubmissionTarget) {
  const table = target.kind === "feedback" ? feedback : issues;
  await tx.delete(table).where(eq(table.id, target.id));
  return removeMatchingNotifications(tx, submissionNotificationCondition(target));
}

export async function deleteSubmissionWithNotifications(target: SubmissionTarget) {
  const removals = await db.transaction(tx => deleteSubmissionAndNotifications(tx, target));
  broadcastNotificationRemoval(removals);
}

export async function removeOrphanedNotificationsForUser(userId: string) {
  const removals = await db.transaction(tx => pruneOrphanedSubmissionNotifications(tx, userId));
  broadcastNotificationRemoval(removals);
}

export async function pruneOrphanedSubmissionNotifications(tx: Transaction, userId: string) {
  const userNotificationIds = tx
    .select({ id: notificationRecipients.notificationId })
    .from(notificationRecipients)
    .where(eq(notificationRecipients.userId, userId));
  return removeMatchingNotifications(tx, and(
    inArray(notifications.id, userNotificationIds),
    orphanedSubmissionCondition,
  )!);
}

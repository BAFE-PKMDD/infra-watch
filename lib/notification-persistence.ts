import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { notificationRecipients, notifications } from "@/lib/db/schema";
import { removeOrphanedNotificationsForUser } from "@/lib/submission-notifications";
import { notificationRecipientsForChannel } from "@/lib/account-preferences";
import { enqueueJob } from "@/lib/background-jobs";
import {
  broadcastNotification,
  createRealtimeNotification,
  type RealtimeNotification,
} from "@/lib/realtime-notifications";

export type StoredNotification = RealtimeNotification & {
  readAt?: string | null;
};

function uniqueRecipientIds(recipientUserIds: string[]) {
  return Array.from(new Set(recipientUserIds.map((id) => id.trim()).filter(Boolean)));
}

async function persistNotification(
  notification: RealtimeNotification,
  recipientUserIds: string[],
) {
  await db.transaction(async (tx) => {
    await tx
      .insert(notifications)
      .values({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata ?? {},
        createdAt: new Date(notification.createdAt),
      })
      .onConflictDoNothing();

    await tx
      .insert(notificationRecipients)
      .values(
        recipientUserIds.map((userId) => ({
          userId,
          notificationId: notification.id,
        })),
      )
      .onConflictDoNothing();
  });
}

export async function publishAndPersistNotification(
  input: Omit<RealtimeNotification, "id" | "createdAt" | "isRead">,
  recipientUserIds: string[],
) {
  const allRecipients = uniqueRecipientIds(recipientUserIds);
  if (!allRecipients.length) return null;
  const [recipients, emailRecipients, smsRecipients] = await Promise.all([
    notificationRecipientsForChannel(allRecipients, "inApp"),
    notificationRecipientsForChannel(allRecipients, "email"),
    notificationRecipientsForChannel(allRecipients, "sms"),
  ]);
  const notification = createRealtimeNotification(input);
  if (recipients.length) {
    await persistNotification(notification, recipients);
    broadcastNotification(notification, recipients);
  }
  if (emailRecipients.length || smsRecipients.length) {
    await enqueueJob("notification-delivery", "system", { notification, emailRecipients, smsRecipients }, `notification:${notification.id}`);
  }
  return notification;
}

export async function getNotificationsForUser(
  userId: string,
): Promise<StoredNotification[]> {
  await removeOrphanedNotificationsForUser(userId);
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      metadata: notifications.metadata,
      createdAt: notifications.createdAt,
      readAt: notificationRecipients.readAt,
    })
    .from(notificationRecipients)
    .innerJoin(
      notifications,
      eq(notifications.id, notificationRecipients.notificationId),
    )
    .where(eq(notificationRecipients.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    isRead: Boolean(row.readAt),
    readAt: row.readAt?.toISOString() ?? null,
  }));
}

export async function markUserNotificationsRead(
  userId: string,
  options: { id?: string; all?: boolean },
): Promise<{ marked: number }> {
  const conditions = [
    eq(notificationRecipients.userId, userId),
    isNull(notificationRecipients.readAt),
  ];
  if (!options.all && options.id) {
    conditions.push(eq(notificationRecipients.notificationId, options.id));
  }

  const updated = await db
    .update(notificationRecipients)
    .set({ readAt: new Date() })
    .where(and(...conditions))
    .returning({ id: notificationRecipients.id });

  return { marked: updated.length };
}

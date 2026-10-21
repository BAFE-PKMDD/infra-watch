import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountPreferences } from "@/lib/db/schema";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/operations-models";

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const [row] = await db
    .select()
    .from(accountPreferences)
    .where(eq(accountPreferences.userId, userId))
    .limit(1);
  return row
    ? { inApp: row.inApp, email: row.email, sms: row.sms }
    : { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export async function notificationRecipientsForChannel(
  userIds: string[],
  channel: keyof NotificationPreferences,
) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return [];
  const preferences = await db
    .select()
    .from(accountPreferences)
    .where(inArray(accountPreferences.userId, ids));
  const byId = new Map(preferences.map((row) => [row.userId, row]));
  return ids.filter(
    (id) =>
      byId.get(id)?.[channel] ?? DEFAULT_NOTIFICATION_PREFERENCES[channel],
  );
}

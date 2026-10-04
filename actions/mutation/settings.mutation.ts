"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { requireAuth } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getAuditContextFromServerAction } from "@/lib/audit";
import { AutoReplySettings } from "@/types/auto-reply.types";
import { getAutoReplySettings } from "@/actions/query/settings.query";

/**
 * Upsert a system setting (requires system_settings:update permission).
 */
async function updateSystemSetting(key: string, value: unknown, description?: string) {
  const user = await requireAuth();
  requirePermission(user.role, "system_settings", "update");

  const [existing] = await db
    .select({ id: systemSettings.id, value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, description, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value, description, updatedBy: user.id });
  }

  await logAudit({
    tableName: "system_settings",
    recordId: key,
    action: existing ? "UPDATE" : "CREATE",
    oldValues: existing ? { value: existing.value } : undefined,
    newValues: { value },
    notes: `System setting "${key}" updated`,
    context: await getAuditContextFromServerAction({ id: user.id, name: user.name, email: user.email }),
  });

  revalidatePath("/settings");

  return user;
}

/**
 * Update auto-reply/auto-accept settings.
 */
export async function updateAutoReplySettings(data: AutoReplySettings) {
  try {
    const trimmedIssuesMessage = data.issues.message.trim();
    if (data.issues.enabled && trimmedIssuesMessage.length < 10) {
      return { success: false, error: "Issue acknowledgment message must be at least 10 characters when auto-accept is enabled." };
    }

    const trimmedFeedbackMessage = data.feedback.message.trim();
    if (data.feedback.enabled && trimmedFeedbackMessage.length < 10) {
      return { success: false, error: "Feedback acknowledgment message must be at least 10 characters when auto-accept is enabled." };
    }

    const current = await getAutoReplySettings();
    const next: AutoReplySettings = {
      ...current.data,
      ...data,
      issues: { ...data.issues, message: trimmedIssuesMessage },
      feedback: { ...data.feedback, message: trimmedFeedbackMessage },
    };

    await updateSystemSetting(
      "auto_reply_config",
      next,
      "Configurable auto-reply/auto-accept messages for Feedback, Issues, and Contact Inbox.",
    );

    return { success: true, data: next };
  } catch (error) {
    console.error("Error updating auto-reply settings", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update auto-reply settings" };
  }
}

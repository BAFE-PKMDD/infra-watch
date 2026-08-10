"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import { deleteFile } from "@/lib/minio";
import { requirePermission } from "@/lib/permissions";
import { checkModeratorScope } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import { eq } from "drizzle-orm";

type FeedbackModerationStatus = "approved" | "rejected";

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  status?: number;
};

function toHttpError(message: string, status: number) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

async function requireFeedbackPermission(action: "approve" | "reject" | "delete") {
  const user = await getCurrentUser();

  if (!user) {
    throw toHttpError("Unauthorized", 401);
  }

  requirePermission(user.role as string | null | undefined, "feedback", action);
  return user;
}

export async function moderateFeedback(data: {
  feedbackId: string;
  status: FeedbackModerationStatus;
  moderationNote?: string;
}): Promise<ActionResult> {
  try {
    const action = data.status === "approved" ? "approve" : "reject";
    const currentUser = await requireFeedbackPermission(action);

    if (!["approved", "rejected"].includes(data.status)) {
      return {
        success: false,
        error: "Invalid status. Must be approved or rejected.",
        status: 400,
      };
    }

    const [existing] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, data.feedbackId))
      .limit(1);

    if (!existing) {
      return {
        success: false,
        error: "Feedback not found",
        status: 404,
      };
    }

    const scopeCheck = await checkModeratorScope(currentUser, existing.projectId);
    if (!scopeCheck.allowed) {
      return {
        success: false,
        error: `Forbidden: ${scopeCheck.reason}`,
        status: 403,
      };
    }

    const [updated] = await db
      .update(feedback)
      .set({
        status: data.status,
        moderatedBy: currentUser.id,
        moderatedAt: new Date(),
        moderationNote: data.moderationNote?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, data.feedbackId))
      .returning();

    revalidatePath("/feedbacks");
    revalidatePath(`/projects/${existing.projectId}`);

    await logAudit({
      tableName: "feedback",
      recordId: updated.id,
      action: "UPDATE",
      oldValues: { ...existing },
      newValues: { ...updated },
      notes: `Feedback ${data.status}`,
      context: await getAuditContextFromServerAction(currentUser),
    });

    return {
      success: true,
      message: `Feedback ${data.status} successfully`,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to moderate feedback",
      status: error instanceof Error ? (error as Error & { status?: number }).status : undefined,
    };
  }
}

export async function deleteFeedback(feedbackId: string): Promise<ActionResult> {
  try {
    const currentUser = await requireFeedbackPermission("delete");

    const [existing] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId))
      .limit(1);

    if (!existing) {
      return {
        success: false,
        error: "Feedback not found",
        status: 404,
      };
    }

    const scopeCheck = await checkModeratorScope(currentUser, existing.projectId);
    if (!scopeCheck.allowed) {
      return {
        success: false,
        error: `Forbidden: ${scopeCheck.reason}`,
        status: 403,
      };
    }

    const media = Array.isArray(existing.media) ? existing.media : [];
    await Promise.allSettled(
      media.map((item) => item?.url ? deleteFile(item.url) : Promise.resolve()),
    );

    await db.delete(feedback).where(eq(feedback.id, feedbackId));

    revalidatePath("/feedbacks");
    revalidatePath(`/projects/${existing.projectId}`);

    await logAudit({
      tableName: "feedback",
      recordId: existing.id,
      action: "DELETE",
      oldValues: { ...existing },
      notes: "Feedback deleted",
      context: await getAuditContextFromServerAction(currentUser),
    });

    return {
      success: true,
      message: "Feedback deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete feedback",
      status: error instanceof Error ? (error as Error & { status?: number }).status : undefined,
    };
  }
}

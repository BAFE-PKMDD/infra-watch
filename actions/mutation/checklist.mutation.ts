"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { projectChecklistItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/session";

const statusSchema = z.enum(["pending", "in_progress", "needs_review", "completed", "blocked"]);

export async function updateChecklistItemStatus(formData: FormData) {
  const user = await requireAuth();
  const itemId = String(formData.get("itemId") ?? "");
  const status = statusSchema.parse(String(formData.get("status") ?? "pending"));
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!itemId) {
    throw new Error("Checklist item is required.");
  }

  await db
    .update(projectChecklistItems)
    .set({
      status,
      remarks: remarks || null,
      completedBy: status === "completed" ? user.id : null,
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(projectChecklistItems.id, itemId));

  revalidatePath("/checklists");
}
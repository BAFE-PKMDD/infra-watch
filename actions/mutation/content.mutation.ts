"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import { CONTENT_KINDS, type ContentKind } from "@/lib/content-models";
import {
  deleteManagedContent,
  listManagedContent,
  saveManagedContent,
} from "@/lib/content-management";
import { requireAuth } from "@/lib/session";

export async function loadContent(
  kind: ContentKind,
  options: { search?: string; page?: number } = {},
) {
  return listManagedContent(
    await requireAuth(),
    z.enum(CONTENT_KINDS).parse(kind),
    options,
  );
}

function refreshContent(kind: ContentKind) {
  revalidatePath(`/${kind}`);
  revalidatePath("/articles-and-updates");
  revalidatePath("/map");
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/");
}

export async function saveContent(
  kind: ContentKind,
  input: unknown,
  id?: string,
) {
  try {
    const user = await requireAuth();
    z.enum(CONTENT_KINDS).parse(kind);
    const { saved, existing } = await saveManagedContent(user, kind, input, id);
    await logAudit({
      tableName: kind.replaceAll("-", "_"),
      recordId: saved.id,
      action: id ? "UPDATE" : "CREATE",
      oldValues: existing,
      newValues: saved,
      context: await getAuditContextFromServerAction(user),
    });
    refreshContent(kind);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof z.ZodError
          ? error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
          : error instanceof Error
            ? error.message
            : "Could not save this record",
    };
  }
}

export async function removeContent(kind: ContentKind, id: string) {
  try {
    const user = await requireAuth();
    z.enum(CONTENT_KINDS).parse(kind);
    z.uuid().parse(id);
    const existing = await deleteManagedContent(user, kind, id);
    await logAudit({
      tableName: kind.replaceAll("-", "_"),
      recordId: id,
      action: "DELETE",
      oldValues: existing,
      context: await getAuditContextFromServerAction(user),
    });
    refreshContent(kind);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not delete this record",
    };
  }
}

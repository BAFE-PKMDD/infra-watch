"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbDocuments, kbChunks } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/kb-embedding";
import { chunkText } from "@/lib/kb-chunker";
import { getCurrentUser } from "@/lib/session";
import { requirePermission, statement } from "@/lib/permissions";
import { logAudit, getAuditContextFromServerAction } from "@/lib/audit";
import { deleteFile } from "@/lib/minio";

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  status?: number;
};

type KbAction = (typeof statement.knowledge_base)[number];

async function requireKbPermission(action: KbAction) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  requirePermission(user.role as string | null | undefined, "knowledge_base", action);
  return user;
}

export async function addFaqEntry(data: {
  question: string;
  answer: string;
}): Promise<ActionResult> {
  try {
    const user = await requireKbPermission("create");

    if (!data.question.trim() || !data.answer.trim()) {
      return { success: false, error: "Question and answer are required.", status: 400 };
    }

    const faqText = `Q: ${data.question.trim()}\nA: ${data.answer.trim()}`;
    const chunks = chunkText(faqText);

    const [doc] = await db
      .insert(kbDocuments)
      .values({
        title: data.question.trim(),
        category: "FAQ",
        fileType: "FAQ Entry",
        chunkCount: chunks.length,
        status: "indexing",
        faqQuestion: data.question.trim(),
        faqAnswer: data.answer.trim(),
        contentPreview: `Q: ${data.question.trim()}`.slice(0, 200),
        uploadedBy: user.id,
        uploadedByName: user.name ?? "Unknown",
      })
      .returning();

    try {
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content);
        await db.insert(kbChunks).values({
          documentId: doc.id,
          chunkIndex: chunk.index,
          content: chunk.content,
          embedding,
          tokenCount: chunk.tokenCount,
        });
      }

      await db
        .update(kbDocuments)
        .set({ status: "embedded", chunkCount: chunks.length })
        .where(eq(kbDocuments.id, doc.id));
    } catch (embedError) {
      const errorMsg = embedError instanceof Error ? embedError.message : "Embedding failed";
      await db
        .update(kbDocuments)
        .set({ status: "failed", errorMessage: errorMsg })
        .where(eq(kbDocuments.id, doc.id));
      return { success: false, error: `FAQ saved but embedding failed: ${errorMsg}` };
    }

    revalidatePath("/knowledge-base");

    await logAudit({
      tableName: "kb_documents",
      recordId: doc.id,
      action: "CREATE",
      newValues: { title: doc.title, category: doc.category, fileType: doc.fileType },
      notes: "FAQ entry created and embedded",
      context: await getAuditContextFromServerAction(user),
    });

    return { success: true, message: "FAQ entry created and embedded successfully.", data: doc };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create FAQ entry",
    };
  }
}

export async function deleteKbDocument(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireKbPermission("delete");

    const [existing] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Document not found", status: 404 };
    }

    if (!existing.archivedAt) {
      return {
        success: false,
        error: "Archive the document before deleting it permanently.",
        status: 409,
      };
    }

    // Delete MinIO file if it exists
    if (existing.filePath) {
      try {
        await deleteFile(existing.filePath);
      } catch {
        // File might already be deleted, continue
      }
    }

    // Chunks are cascade-deleted via FK
    await db.delete(kbDocuments).where(eq(kbDocuments.id, documentId));

    revalidatePath("/knowledge-base");

    await logAudit({
      tableName: "kb_documents",
      recordId: existing.id,
      action: "DELETE",
      oldValues: { title: existing.title, category: existing.category },
      notes: "Knowledge base document deleted",
      context: await getAuditContextFromServerAction(user),
    });

    return { success: true, message: "Document deleted successfully." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}

export async function archiveKbDocument(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireKbPermission("update");
    const [existing] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!existing) return { success: false, error: "Document not found", status: 404 };
    if (existing.archivedAt) return { success: true, message: "Document is already archived." };

    const archivedAt = new Date();
    await db
      .update(kbDocuments)
      .set({ archivedAt, archivedBy: user.id })
      .where(eq(kbDocuments.id, documentId));

    revalidatePath("/knowledge-base");
    await logAudit({
      tableName: "kb_documents",
      recordId: existing.id,
      action: "UPDATE",
      oldValues: { archivedAt: existing.archivedAt },
      newValues: { archivedAt, archivedBy: user.id },
      notes: "Knowledge base document archived and excluded from AI retrieval",
      context: await getAuditContextFromServerAction(user),
    });

    return { success: true, message: "Document archived successfully." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive document" };
  }
}

export async function restoreKbDocument(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireKbPermission("update");
    const [existing] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!existing) return { success: false, error: "Document not found", status: 404 };
    if (!existing.archivedAt) return { success: true, message: "Document is already active." };

    await db
      .update(kbDocuments)
      .set({ archivedAt: null, archivedBy: null })
      .where(eq(kbDocuments.id, documentId));

    revalidatePath("/knowledge-base");
    await logAudit({
      tableName: "kb_documents",
      recordId: existing.id,
      action: "UPDATE",
      oldValues: { archivedAt: existing.archivedAt, archivedBy: existing.archivedBy },
      newValues: { archivedAt: null, archivedBy: null },
      notes: "Knowledge base document restored to AI retrieval",
      context: await getAuditContextFromServerAction(user),
    });

    return { success: true, message: "Document restored successfully." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore document" };
  }
}

export async function reindexDocument(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireKbPermission("embed");

    const [doc] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      return { success: false, error: "Document not found", status: 404 };
    }

    if (doc.archivedAt) {
      return { success: false, error: "Restore this document before reindexing it.", status: 409 };
    }

    // Update status to indexing
    await db
      .update(kbDocuments)
      .set({ status: "indexing", errorMessage: null })
      .where(eq(kbDocuments.id, documentId));

    // Delete existing chunks
    await db.delete(kbChunks).where(eq(kbChunks.documentId, documentId));

    // Trigger reprocessing via internal API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3101";
    fetch(`${baseUrl}/api/knowledge-base/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    }).catch((err) => {
      console.error("[KB] Failed to trigger reindex:", err);
    });

    revalidatePath("/knowledge-base");

    await logAudit({
      tableName: "kb_documents",
      recordId: doc.id,
      action: "UPDATE",
      notes: "Document reindexing triggered",
      context: await getAuditContextFromServerAction(user),
    });

    return { success: true, message: "Document reindexing started." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reindex document",
    };
  }
}

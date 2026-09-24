"use server";

import { and, count, desc, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbChunks, kbDocuments } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

async function requireKbRead(action: "list" | "read") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requirePermission(user.role as string | null | undefined, "knowledge_base", action);
}

export async function getKbDocuments(filters?: {
  search?: string;
  category?: string;
  status?: string;
  archived?: boolean;
}) {
  await requireKbRead("list");
  const conditions = [
    filters?.archived ? isNotNull(kbDocuments.archivedAt) : isNull(kbDocuments.archivedAt),
  ];

  if (filters?.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      sql`(${ilike(kbDocuments.title, pattern)} OR ${ilike(kbDocuments.contentPreview, pattern)} OR ${ilike(kbDocuments.fileName, pattern)})`,
    );
  }

  if (filters?.category && filters.category !== "all") {
    conditions.push(eq(kbDocuments.category, filters.category));
  }

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(kbDocuments.status, filters.status));
  }

  return db
    .select({
      id: kbDocuments.id,
      title: kbDocuments.title,
      category: kbDocuments.category,
      visibility: kbDocuments.visibility,
      fileType: kbDocuments.fileType,
      fileName: kbDocuments.fileName,
      fileSize: kbDocuments.fileSize,
      chunkCount: kbDocuments.chunkCount,
      status: kbDocuments.status,
      faqQuestion: kbDocuments.faqQuestion,
      faqAnswer: kbDocuments.faqAnswer,
      contentPreview: kbDocuments.contentPreview,
      errorMessage: kbDocuments.errorMessage,
      uploadedByName: kbDocuments.uploadedByName,
      archivedAt: kbDocuments.archivedAt,
      archivedBy: kbDocuments.archivedBy,
      createdAt: kbDocuments.createdAt,
      updatedAt: kbDocuments.updatedAt,
    })
    .from(kbDocuments)
    .where(and(...conditions))
    .orderBy(desc(kbDocuments.createdAt));
}

export async function getKbStats() {
  await requireKbRead("list");
  const activeCondition = isNull(kbDocuments.archivedAt);
  const [totals] = await db
    .select({ totalDocuments: count() })
    .from(kbDocuments)
    .where(activeCondition);

  const [chunkTotals] = await db
    .select({ totalChunks: count() })
    .from(kbChunks)
    .innerJoin(kbDocuments, eq(kbChunks.documentId, kbDocuments.id))
    .where(activeCondition);

  const [embeddedCount] = await db
    .select({ count: count() })
    .from(kbDocuments)
    .where(and(eq(kbDocuments.status, "embedded"), activeCondition));

  const [archivedCount] = await db
    .select({ count: count() })
    .from(kbDocuments)
    .where(isNotNull(kbDocuments.archivedAt));

  const categories = await db
    .select({ category: kbDocuments.category, count: count() })
    .from(kbDocuments)
    .where(activeCondition)
    .groupBy(kbDocuments.category);

  return {
    totalDocuments: totals.totalDocuments,
    totalChunks: chunkTotals.totalChunks,
    embeddedCount: embeddedCount.count,
    archivedDocuments: archivedCount.count,
    embeddingHealth:
      totals.totalDocuments > 0
        ? Math.round((embeddedCount.count / totals.totalDocuments) * 100)
        : 0,
    activeCategories: categories.length,
    categoryBreakdown: categories,
  };
}

export async function getKbCategories() {
  await requireKbRead("list");
  const rows = await db
    .selectDistinct({ category: kbDocuments.category })
    .from(kbDocuments)
    .orderBy(kbDocuments.category);

  return rows.map((row) => row.category);
}

export async function getKbDocumentWithChunks(documentId: string) {
  await requireKbRead("read");
  const [doc] = await db
    .select({ id: kbDocuments.id })
    .from(kbDocuments)
    .where(eq(kbDocuments.id, documentId))
    .limit(1);

  if (!doc) return null;

  const chunks = await db
    .select({
      id: kbChunks.id,
      chunkIndex: kbChunks.chunkIndex,
      content: kbChunks.content,
      tokenCount: kbChunks.tokenCount,
      createdAt: kbChunks.createdAt,
    })
    .from(kbChunks)
    .where(eq(kbChunks.documentId, documentId))
    .orderBy(kbChunks.chunkIndex);

  return { chunks };
}

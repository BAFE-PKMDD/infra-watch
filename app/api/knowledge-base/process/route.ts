import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { chunkText } from "@/lib/kb-chunker";
import { generateEmbedding } from "@/lib/kb-embedding";
import { extractText } from "@/lib/kb-extractor";
import { db } from "@/lib/db";
import { kbChunks, kbDocuments } from "@/lib/db/schema";
import { downloadFile } from "@/lib/minio";
import { hasPermission } from "@/lib/permissions";
import {
  createKnowledgeBaseProcessPostHandler,
  KnowledgeBaseProcessHttpError,
} from "./handler";

export const runtime = "nodejs";
export const maxDuration = 300;

type ProcessResult = {
  chunksProcessed: number;
  totalChunks: number;
};

async function processKnowledgeBaseDocument(documentId: string): Promise<ProcessResult> {
  try {
    const [document] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!document) {
      throw new KnowledgeBaseProcessHttpError("Document not found.", 404);
    }

    await db
      .update(kbDocuments)
      .set({ status: "indexing", errorMessage: null })
      .where(eq(kbDocuments.id, documentId));

    let rawText = "";
    if (document.fileType === "FAQ Entry") {
      if (!document.faqQuestion || !document.faqAnswer) {
        throw new Error("FAQ entry missing question or answer.");
      }
      rawText = `Q: ${document.faqQuestion}\nA: ${document.faqAnswer}`;
    } else {
      if (!document.filePath) {
        throw new Error("Document has no file path.");
      }
      const fileBuffer = await downloadFile(document.filePath);
      rawText = await extractText(fileBuffer, document.fileType);
    }

    const preview = rawText.slice(0, 200).trim();
    const textChunks = chunkText(rawText);
    if (textChunks.length === 0) {
      throw new Error("No text chunks could be generated from the document.");
    }

    await db.delete(kbChunks).where(eq(kbChunks.documentId, documentId));

    let embeddedCount = 0;
    let lastError: unknown = null;
    for (const chunk of textChunks) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        await db.insert(kbChunks).values({
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          embedding,
          tokenCount: chunk.tokenCount,
        });
        embeddedCount += 1;
      } catch (chunkError) {
        lastError = chunkError;
        console.error(`[KB Process] Failed to embed chunk ${chunk.index}:`, chunkError);
      }
    }

    if (embeddedCount === 0) {
      throw new Error(
        `Failed to embed any chunks. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      );
    }

    await db
      .update(kbDocuments)
      .set({
        status: "embedded",
        chunkCount: embeddedCount,
        contentPreview: preview,
        errorMessage: embeddedCount < textChunks.length
          ? `${embeddedCount}/${textChunks.length} chunks embedded successfully`
          : null,
      })
      .where(eq(kbDocuments.id, documentId));

    return {
      chunksProcessed: embeddedCount,
      totalChunks: textChunks.length,
    };
  } catch (error) {
    if (!(error instanceof KnowledgeBaseProcessHttpError && error.status === 404)) {
      try {
        await db
          .update(kbDocuments)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Processing failed",
          })
          .where(eq(kbDocuments.id, documentId));
      } catch {
        // Preserve the original processing failure.
      }
    }
    throw error;
  }
}

const postHandler = createKnowledgeBaseProcessPostHandler({
  getSessionUser: async (headers) => {
    const session = await auth.api.getSession({ headers });
    return session?.user
      ? { id: session.user.id, role: session.user.role as string | string[] | null | undefined }
      : null;
  },
  canEmbedKnowledgeBase: (role) => hasPermission(role, "knowledge_base", "embed"),
  processDocument: processKnowledgeBaseDocument,
  onError: (error) => console.error("[KB Process] Error:", error),
});

export async function POST(request: NextRequest) {
  return postHandler(request);
}

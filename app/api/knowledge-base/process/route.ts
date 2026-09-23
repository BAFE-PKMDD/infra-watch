import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { chunkText } from "@/lib/kb-chunker";
import { generateEmbedding } from "@/lib/kb-embedding";
import { extractText } from "@/lib/kb-extractor";
import { db } from "@/lib/db";
import { kbChunks, kbDocuments } from "@/lib/db/schema";
import { downloadFile } from "@/lib/minio";
import {
  assertKnowledgeBaseDocumentProcessable,
  assertKnowledgeBaseReplacementComplete,
  getKnowledgeBaseProcessingFailureMessage,
  KnowledgeBaseProcessingPolicyError,
} from "@/lib/knowledge-base-processing-policy";
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
  let hadExistingIndex = false;
  try {
    const [document] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!document) {
      throw new KnowledgeBaseProcessHttpError("Document not found.", 404);
    }

    hadExistingIndex = document.status === "embedded" && (document.chunkCount ?? 0) > 0;

    try {
      assertKnowledgeBaseDocumentProcessable(document);
    } catch (error) {
      if (error instanceof KnowledgeBaseProcessingPolicyError) {
        throw new KnowledgeBaseProcessHttpError(error.message, error.status);
      }
      throw error;
    }

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

    const replacementChunks: Array<typeof kbChunks.$inferInsert> = [];
    for (const chunk of textChunks) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        replacementChunks.push({
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          embedding,
          tokenCount: chunk.tokenCount,
        });
      } catch (chunkError) {
        console.error(`[KB Process] Failed to embed chunk ${chunk.index}:`, chunkError);
      }
    }

    const embeddedCount = replacementChunks.length;
    assertKnowledgeBaseReplacementComplete(textChunks.length, embeddedCount);

    await db.transaction(async (transaction) => {
      await transaction.delete(kbChunks).where(eq(kbChunks.documentId, documentId));
      await transaction.insert(kbChunks).values(replacementChunks);
      await transaction
        .update(kbDocuments)
        .set({
          status: "embedded",
          chunkCount: embeddedCount,
          contentPreview: preview,
          errorMessage: null,
        })
        .where(eq(kbDocuments.id, documentId));
    });

    return {
      chunksProcessed: embeddedCount,
      totalChunks: textChunks.length,
    };
  } catch (error) {
    const isExpectedHttpError = error instanceof KnowledgeBaseProcessHttpError
      && (error.status === 404 || error.status === 409);
    if (!isExpectedHttpError) {
      try {
        await db
          .update(kbDocuments)
          .set({
            status: hadExistingIndex ? "embedded" : "failed",
            errorMessage: getKnowledgeBaseProcessingFailureMessage(error),
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

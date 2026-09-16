import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbDocuments, kbChunks } from "@/lib/db/schema";
import { extractText } from "@/lib/kb-extractor";
import { chunkText } from "@/lib/kb-chunker";
import { generateEmbedding } from "@/lib/kb-embedding";
import { downloadFile } from "@/lib/minio";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large documents

export async function POST(request: NextRequest) {
  let documentId: string | null = null;

  try {
    const body = await request.json();
    documentId = body.documentId;

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json({ error: "documentId is required." }, { status: 400 });
    }

    // Fetch document record
    const [doc] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Update status to indexing
    await db
      .update(kbDocuments)
      .set({ status: "indexing", errorMessage: null })
      .where(eq(kbDocuments.id, documentId));

    let rawText = "";

    if (doc.fileType === "FAQ Entry") {
      if (!doc.faqQuestion || !doc.faqAnswer) {
        throw new Error("FAQ entry missing question or answer.");
      }
      rawText = `Q: ${doc.faqQuestion}\nA: ${doc.faqAnswer}`;
    } else {
      // Download file from MinIO
      if (!doc.filePath) {
        throw new Error("Document has no file path.");
      }

      const fileBuffer = await downloadFile(doc.filePath);

      // Extract text from file
      rawText = await extractText(fileBuffer, doc.fileType);
    }

    // Update content preview
    const preview = rawText.slice(0, 200).trim();

    // Chunk the text
    const textChunks = chunkText(rawText);

    if (textChunks.length === 0) {
      throw new Error("No text chunks could be generated from the document.");
    }

    // Delete existing chunks (for reindex case)
    await db.delete(kbChunks).where(eq(kbChunks.documentId, documentId));

    let embeddedCount = 0;
    let lastError = null;
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
        embeddedCount++;
      } catch (chunkError) {
        lastError = chunkError;
        console.error(`[KB Process] Failed to embed chunk ${chunk.index}:`, chunkError);
      }
    }

    if (embeddedCount === 0) {
      throw new Error(`Failed to embed any chunks. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }

    // Update document as embedded
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

    return NextResponse.json({
      success: true,
      chunksProcessed: embeddedCount,
      totalChunks: textChunks.length,
    });
  } catch (error) {
    console.error("[KB Process] Error:", error);

    // Update document status to failed
    if (documentId) {
      try {
        await db
          .update(kbDocuments)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Processing failed",
          })
          .where(eq(kbDocuments.id, documentId));
      } catch {
        // Ignore update error
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed." },
      { status: 500 },
    );
  }
}

// import 'server-only';

import { db } from '@/lib/db';
import { generateEmbedding } from '@/lib/kb-embedding';
import { kbDocuments, kbChunks } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export interface KbSearchResult {
  documentId: string;
  documentTitle: string;
  documentCategory: string;
  chunkContent: string;
  chunkIndex: number;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchKnowledgeBase(
  query: string,
  opts?: { limit?: number; minSimilarity?: number; category?: string }
): Promise<KbSearchResult[]> {
  try {
    const limit = opts?.limit ?? 5;
    const minSimilarity = opts?.minSimilarity ?? 0.3;

    const embedding = await generateEmbedding(query);
    if (!embedding || embedding.length === 0) {
      return [];
    }

    // Fetch all embedded chunks (filtered by category if provided)
    // Since kb chunks are typically in the thousands, fetching them to Node.js is fast
    const conditions = [eq(kbDocuments.status, 'embedded'), isNull(kbDocuments.archivedAt)];
    if (opts?.category) {
      conditions.push(eq(kbDocuments.category, opts.category));
    }

    // Query candidate chunks from active embedded documents.
    const chunks = await db
      .select({
        documentId: kbDocuments.id,
        documentTitle: kbDocuments.title,
        documentCategory: kbDocuments.category,
        chunkContent: kbChunks.content,
        chunkIndex: kbChunks.chunkIndex,
        embedding: kbChunks.embedding,
      })
      .from(kbChunks)
      .innerJoin(kbDocuments, eq(kbChunks.documentId, kbDocuments.id))
      .where(and(...conditions));

    // Filter and compute similarity
    const results: KbSearchResult[] = [];
    
    for (const chunk of chunks) {
      if (!chunk.embedding) continue;
      
      const similarity = cosineSimilarity(embedding, chunk.embedding);
      if (similarity > minSimilarity) {
        results.push({
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          documentCategory: chunk.documentCategory,
          chunkContent: chunk.chunkContent,
          chunkIndex: chunk.chunkIndex,
          similarity,
        });
      }
    }

    // Sort descending and slice
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchKnowledgeBase] Error searching knowledge base:', error);
    return [];
  }
}

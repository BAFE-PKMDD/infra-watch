export class KnowledgeBaseProcessingPolicyError extends Error {
  readonly status = 409;
}

export function assertKnowledgeBaseDocumentProcessable(document: {
  archivedAt?: Date | null;
}): void {
  if (document.archivedAt) {
    throw new KnowledgeBaseProcessingPolicyError(
      "Restore this document before processing it.",
    );
  }
}

export function assertKnowledgeBaseReplacementComplete(
  expectedChunkCount: number,
  embeddedChunkCount: number,
): void {
  if (expectedChunkCount < 1 || embeddedChunkCount !== expectedChunkCount) {
    throw new Error("All document chunks must be embedded before replacing the current index.");
  }
}

export function getKnowledgeBaseProcessingFailureMessage(error: unknown): string {
  void error;
  return "Document processing failed. Retry or contact an administrator.";
}

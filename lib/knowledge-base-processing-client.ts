type ProcessResponse = {
  success?: boolean;
  chunksProcessed?: unknown;
  totalChunks?: unknown;
  error?: unknown;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function processKnowledgeBaseDocument(
  documentId: string,
  fetchFn: FetchLike = fetch,
): Promise<{ chunksProcessed: number; totalChunks: number }> {
  const response = await fetchFn("/api/knowledge-base/process", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });

  const payload = await response.json().catch(() => ({})) as ProcessResponse;
  if (!response.ok || payload.success !== true) {
    throw new Error(
      typeof payload.error === "string" && payload.error
        ? payload.error
        : "Knowledge base processing failed.",
    );
  }

  return {
    chunksProcessed: typeof payload.chunksProcessed === "number" ? payload.chunksProcessed : 0,
    totalChunks: typeof payload.totalChunks === "number" ? payload.totalChunks : 0,
  };
}

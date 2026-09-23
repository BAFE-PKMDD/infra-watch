type SessionUser = {
  id: string;
  role?: string | string[] | null;
};

type ProcessResult = {
  chunksProcessed: number;
  totalChunks: number;
};

export type KnowledgeBaseProcessRouteDependencies = {
  getSessionUser: (headers: Headers) => Promise<SessionUser | null>;
  canEmbedKnowledgeBase: (role: SessionUser["role"]) => boolean;
  processDocument: (documentId: string) => Promise<ProcessResult>;
  onError?: (error: unknown) => void;
};

export class KnowledgeBaseProcessHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function createKnowledgeBaseProcessPostHandler(
  dependencies: KnowledgeBaseProcessRouteDependencies,
) {
  return async function knowledgeBaseProcessPost(request: Request) {
    const user = await dependencies.getSessionUser(request.headers);
    if (!user) {
      return json({ error: "Authentication required." }, 401);
    }

    if (!dependencies.canEmbedKnowledgeBase(user.role)) {
      return json({ error: "Insufficient permissions." }, 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "A valid JSON request body is required." }, 400);
    }

    const documentId = typeof body === "object" && body !== null && "documentId" in body
      ? (body as { documentId?: unknown }).documentId
      : null;

    if (typeof documentId !== "string" || !documentId.trim()) {
      return json({ error: "documentId is required." }, 400);
    }

    try {
      const result = await dependencies.processDocument(documentId);
      return json({ success: true, ...result });
    } catch (error) {
      dependencies.onError?.(error);
      const status = error instanceof KnowledgeBaseProcessHttpError ? error.status : 500;
      const message = status === 404
        ? "Document not found."
        : status === 409
          ? "Restore this document before processing it."
          : "Knowledge base processing failed.";
      return json({ error: message }, status);
    }
  };
}

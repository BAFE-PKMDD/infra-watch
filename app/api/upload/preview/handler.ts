const GENERATED_NAME = "\\d+-[a-f0-9]{32}";
const PUBLIC_PREVIEW_PATH = new RegExp(
  `^(?:feedback|feedback-comment|live-videos)/${GENERATED_NAME}\\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$`,
  "i",
);
const ISSUE_EVIDENCE_PATH = new RegExp(
  `^issue-evidence/${GENERATED_NAME}\\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$`,
  "i",
);
const KNOWLEDGE_BASE_PATH = new RegExp(
  `^knowledge-base/${GENERATED_NAME}\\.(?:pdf|txt|md)$`,
  "i",
);

const MEDIA_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

type PreviewUser = {
  id: string;
  role?: string | string[] | null;
  region?: string | null;
  assignedAgency?: string | null;
};

export type UploadPreviewDependencies = {
  getSessionUser: (headers: Headers) => Promise<PreviewUser | null>;
  canReadKnowledgeBase: (role: PreviewUser["role"]) => boolean;
  canReadIssueEvidence: (user: PreviewUser, path: string) => Promise<boolean>;
  loadMedia: (path: string) => Promise<Buffer>;
  onError?: (error: unknown) => void;
};

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function createUploadPreviewGetHandler(dependencies: UploadPreviewDependencies) {
  return async function uploadPreviewGet(request: Request) {
    const path = new URL(request.url).searchParams.get("path") ?? "";
    const isKnowledgeBase = KNOWLEDGE_BASE_PATH.test(path);
    const isIssueEvidence = ISSUE_EVIDENCE_PATH.test(path);
    const isPublicPreview = PUBLIC_PREVIEW_PATH.test(path);

    if (!isKnowledgeBase && !isIssueEvidence && !isPublicPreview) {
      return jsonError("Invalid upload preview path.", 400);
    }

    // Feedback, feedback-comment, and live-video media are already shown on
    // public pages to signed-out visitors - only the private storage classes
    // (knowledge base, issue evidence) require a session at all.
    if (!isPublicPreview) {
      const user = await dependencies.getSessionUser(request.headers);
      if (!user) {
        return jsonError("Authentication required.", 401);
      }

      if (isKnowledgeBase && !dependencies.canReadKnowledgeBase(user.role)) {
        return jsonError("Insufficient permissions.", 403);
      }

      if (isIssueEvidence && !(await dependencies.canReadIssueEvidence(user, path))) {
        return jsonError("Insufficient permissions.", 403);
      }
    }

    try {
      const media = await dependencies.loadMedia(path);
      const extension = path.split(".").pop()?.toLowerCase() ?? "";
      return new Response(new Uint8Array(media), {
        headers: {
          "Cache-Control": isPublicPreview
            ? "public, max-age=3600"
            : "private, no-store",
          "Content-Disposition": "inline",
          "Content-Type": MEDIA_CONTENT_TYPES[extension] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      dependencies.onError?.(error);
      return jsonError("Media preview is unavailable.", 404);
    }
  };
}

const MAX_CATEGORY_LENGTH = 80;

export function normalizeKnowledgeBaseCategory(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Category is required.");
  }

  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw new Error(`Category must be ${MAX_CATEGORY_LENGTH} characters or fewer.`);
  }

  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error("Category contains invalid characters.");
  }

  return normalized;
}

function getKnowledgeBaseMimeType(fileType: string): string {
  if (fileType === "PDF") return "application/pdf";
  if (fileType === "Markdown") return "text/markdown; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function sanitizeDownloadFileName(fileName: string): string {
  const withoutPath = fileName.replace(/\\/g, "/").split("/").pop() || "document";
  return withoutPath
    .replace(/[\r\n\u0000-\u001f\u007f]/g, "")
    .replace(/\.\./g, ".")
    .replace(/[";]/g, "_")
    .trim() || "document";
}

export function buildInlineFileHeaders(
  fileName: string,
  fileType: string,
): Record<string, string> {
  const safeFileName = sanitizeDownloadFileName(fileName);
  const asciiFileName = safeFileName.replace(/[^\x20-\x7e]/g, "_");
  const encodedFileName = encodeURIComponent(safeFileName);

  return {
    "Content-Type": getKnowledgeBaseMimeType(fileType),
    "Content-Disposition": `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

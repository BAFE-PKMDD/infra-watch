export const INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE =
  "This image was blocked because it may contain nude or inappropriate content.";

export const MALICIOUS_FILE_UPLOAD_MESSAGE =
  "This file was blocked because its type, extension, or file signature is not allowed.";

export const STORAGE_UNAVAILABLE_UPLOAD_MESSAGE =
  "File storage is temporarily unavailable. Please try uploading again later.";

/** Stable id for an upload error, so the UI can show it in the visitor's language. */
export type UploadErrorCode = "storage" | "inappropriate" | "invalidFile" | "blocked";

/** English toast titles. They match the `site.uploadErrors.title.*` keys. */
export const UPLOAD_ERROR_TITLES: Record<UploadErrorCode, string> = {
  storage: "Storage temporarily unavailable",
  inappropriate: "Inappropriate image blocked",
  invalidFile: "Invalid file blocked",
  blocked: "Upload blocked",
};

const KNOWN_UPLOAD_MESSAGES = new Map<string, Exclude<UploadErrorCode, "blocked">>([
  [STORAGE_UNAVAILABLE_UPLOAD_MESSAGE, "storage"],
  [INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE, "inappropriate"],
  [MALICIOUS_FILE_UPLOAD_MESSAGE, "invalidFile"],
]);

export function isUploadStorageUnavailable(message: string) {
  return (
    /\b(?:ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT)\b/i.test(message) ||
    /unable to connect/i.test(message) ||
    /timed out.*(?:object|file) storage/i.test(message)
  );
}

export function getClientUploadErrorMessage(message: string) {
  if (isUploadStorageUnavailable(message)) {
    return STORAGE_UNAVAILABLE_UPLOAD_MESSAGE;
  }

  if (message.includes("inappropriate content")) {
    return INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE;
  }

  if (
    message.includes("Invalid file") ||
    message.includes("File content does not match") ||
    message.includes("Invalid file extension") ||
    message.includes("Only JPG") ||
    message.includes("Only images and videos")
  ) {
    return MALICIOUS_FILE_UPLOAD_MESSAGE;
  }

  if (message.includes("size exceeds")) {
    return message;
  }

  if (message.includes("No file provided") || message.includes("Invalid upload folder")) {
    return message;
  }

  return null;
}

/** Which kind of upload error `message` is; decides the toast title. */
export function getUploadErrorCode(message: string): UploadErrorCode {
  if (message === STORAGE_UNAVAILABLE_UPLOAD_MESSAGE) {
    return "storage";
  }

  if (message === INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE || message.toLowerCase().includes("nude")) {
    return "inappropriate";
  }

  if (
    message === MALICIOUS_FILE_UPLOAD_MESSAGE ||
    message.toLowerCase().includes("type") ||
    message.toLowerCase().includes("extension") ||
    message.toLowerCase().includes("signature")
  ) {
    return "invalidFile";
  }

  return "blocked";
}

export function getUploadErrorTitle(message: string) {
  return UPLOAD_ERROR_TITLES[getUploadErrorCode(message)];
}

/** The code of one of the three messages above, or null for any other text (server details). */
export function getKnownUploadMessageCode(message: string): Exclude<UploadErrorCode, "blocked"> | null {
  return KNOWN_UPLOAD_MESSAGES.get(message) ?? null;
}

type Translate = (path: string, variables?: Record<string, string | number>) => string;

/**
 * Toast title and description for an upload error in the visitor's language. Upload errors
 * arrive in English; the known ones are shown through the `site.uploadErrors` keys and
 * anything else (server details such as a size limit) is shown as sent.
 */
export function getUploadErrorText(message: string, t: Translate) {
  const messageCode = getKnownUploadMessageCode(message);
  return {
    title: t(`site.uploadErrors.title.${getUploadErrorCode(message)}`),
    description: messageCode ? t(`site.uploadErrors.message.${messageCode}`) : message,
  };
}

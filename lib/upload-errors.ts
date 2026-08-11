export const INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE =
  "This image was blocked because it may contain nude or inappropriate content.";

export const MALICIOUS_FILE_UPLOAD_MESSAGE =
  "This file was blocked because its type, extension, or file signature is not allowed.";

export const STORAGE_UNAVAILABLE_UPLOAD_MESSAGE =
  "File storage is temporarily unavailable. Please try uploading again later.";

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

export function getUploadErrorTitle(message: string) {
  if (message === STORAGE_UNAVAILABLE_UPLOAD_MESSAGE) {
    return "Storage temporarily unavailable";
  }

  if (message === INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE || message.toLowerCase().includes("nude")) {
    return "Inappropriate image blocked";
  }

  if (
    message === MALICIOUS_FILE_UPLOAD_MESSAGE ||
    message.toLowerCase().includes("type") ||
    message.toLowerCase().includes("extension") ||
    message.toLowerCase().includes("signature")
  ) {
    return "Invalid file blocked";
  }

  return "Upload blocked";
}

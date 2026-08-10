export const INAPPROPRIATE_IMAGE_UPLOAD_MESSAGE =
  "This image was blocked because it may contain nude or inappropriate content.";

export const MALICIOUS_FILE_UPLOAD_MESSAGE =
  "This file was blocked because its type, extension, or file signature is not allowed.";

export function getClientUploadErrorMessage(message: string) {
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

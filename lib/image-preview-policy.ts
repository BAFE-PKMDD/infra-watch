export function isTrustedImagePreviewUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      (url.hostname === "storage.bafe.online" ||
        url.hostname === "abemis.bafe.gov.ph" ||
        url.hostname.endsWith(".googleusercontent.com"))
    ) {
      return true;
    }

    return (
      url.protocol === "http:" &&
      url.port === "9000" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

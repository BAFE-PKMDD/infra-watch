const PUBLIC_SOURCE_MEDIA_HOSTS = new Set([
  "storage.bafe.gov.ph",
  "abemis.bafe.gov.ph",
]);

export function safePublicSourceMediaUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !PUBLIC_SOURCE_MEDIA_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizePublicSourceGeotags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((tag) => {
    if (typeof tag === "string") {
      const safeUrl = safePublicSourceMediaUrl(tag);
      return safeUrl ? [{ url: safeUrl, photo_url: safeUrl }] : [];
    }
    if (!tag || typeof tag !== "object") return [];

    const record = tag as Record<string, unknown>;
    const candidate = [record.url, record.photo_url, record.image_url, record.path]
      .find((item): item is string => typeof item === "string");
    const safeUrl = safePublicSourceMediaUrl(candidate);
    if (!safeUrl) return [];

    const sourceFields = { ...record };
    delete sourceFields.url;
    delete sourceFields.photo_url;
    delete sourceFields.image_url;
    delete sourceFields.path;
    return [{ ...sourceFields, url: safeUrl, photo_url: safeUrl }];
  });
}

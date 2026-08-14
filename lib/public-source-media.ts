const PUBLIC_SOURCE_MEDIA_HOSTS = new Set([
  "storage.bafe.gov.ph",
  "abemis.bafe.gov.ph",
]);

type PublicMetadataAdditions = {
  physicalProgress?: number;
  financialProgress?: number;
  calendarDays?: number | null;
  coordinates?: string;
};

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

    const publicTag: Record<string, string | number> = {
      url: safeUrl,
      photo_url: safeUrl,
    };
    copyScalar(record, publicTag, "photo_name");
    copyScalar(record, publicTag, "latitude", "lat");
    copyScalar(record, publicTag, "longitude", "lng");
    copyScalar(record, publicTag, "timestamp");
    copyScalar(record, publicTag, "category");
    return [publicTag];
  });
}

export function sanitizePublicProjectMetadata(
  value: unknown,
  additions: PublicMetadataAdditions = {},
) {
  const metadata = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const geotags = sanitizePublicSourceGeotags(metadata.geotag ?? metadata.geotags);
  const publicMetadata: Record<string, unknown> = {
    ...definedEntries(additions),
    geotag: geotags,
    geotags,
    proposalDocuments: sanitizeRecords(
      metadata.proposalDocuments ?? metadata.proposal_documents,
      ["file_name", "category", "uploaded_at"],
      ["url"],
    ),
    powRelation: sanitizeRecords(
      metadata.powRelation ?? metadata.pow_relation,
      ["total_quantity", "contract_cost", "date", "target", "actual"],
      ["attachment_url"],
    ),
    procurementRelation: sanitizeRecords(
      metadata.procurementRelation ?? metadata.procurement_relation,
      [
        "milestone",
        "target_date",
        "actual_date",
        "factors_affecting_progress",
        "measures_undertaken",
        "remarks",
      ],
      [],
    ),
  };

  const kmlCandidate = typeof metadata.kmllink === "string"
    ? metadata.kmllink
    : metadata.kmllink && typeof metadata.kmllink === "object"
      ? (metadata.kmllink as Record<string, unknown>).url
      : undefined;
  const safeKmlUrl = typeof kmlCandidate === "string"
    ? safePublicSourceMediaUrl(kmlCandidate)
    : null;
  if (safeKmlUrl) publicMetadata.kmllink = safeKmlUrl;

  return publicMetadata;
}

function sanitizeRecords(value: unknown, scalarKeys: string[], urlKeys: string[]) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const target: Record<string, string | number> = {};
    for (const key of scalarKeys) copyScalar(source, target, key);
    for (const key of urlKeys) {
      const safeUrl = typeof source[key] === "string"
        ? safePublicSourceMediaUrl(source[key])
        : null;
      if (safeUrl) target[key] = safeUrl;
    }
    return Object.keys(target).length > 0 ? [target] : [];
  });
}

function copyScalar(
  source: Record<string, unknown>,
  target: Record<string, string | number>,
  key: string,
  alias?: string,
) {
  const value = source[key] ?? (alias ? source[alias] : undefined);
  if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
    target[key] = value;
  }
}

function definedEntries(value: PublicMetadataAdditions) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

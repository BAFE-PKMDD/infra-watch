export type SystemEvidenceMediaType = "image" | "video";
export type SystemEvidenceSourceType = "issue" | "feedback";

export type SystemEvidencePoint = {
  lat: number;
  lon: number;
  accuracy?: number;
  timeSeconds?: number;
};

export type SystemEvidenceMedia = SystemEvidencePoint & {
  type: SystemEvidenceMediaType;
  url: string;
  name?: string;
};

export type SystemEvidenceIssue = {
  issueId: string;
  sourceType: SystemEvidenceSourceType;
  detailUrl: string;
  ticketNumber: string;
  category: string;
  status: string;
  description: string;
  createdAt: string | null;
  location: {
    region: string;
    province: string;
    municipality: string;
    barangay: string;
  };
  evidence: SystemEvidenceMedia[];
  geoVideoTrack: SystemEvidencePoint[];
  geoVideoUrl: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asCoordinate(value: unknown, minimum: number, maximum: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function parsePoint(value: unknown): SystemEvidencePoint | null {
  const point = asRecord(value);
  if (!point) return null;

  const lat = asCoordinate(point.lat ?? point.latitude, -90, 90);
  const lon = asCoordinate(point.lon ?? point.lng ?? point.longitude, -180, 180);
  if (lat === null || lon === null) return null;

  const accuracy = asCoordinate(point.accuracy, 0, Number.MAX_SAFE_INTEGER);
  const timeSeconds = asCoordinate(point.timeSeconds, 0, Number.MAX_VALUE);
  return {
    lat,
    lon,
    ...(accuracy === null ? {} : { accuracy }),
    ...(timeSeconds === null ? {} : { timeSeconds }),
  };
}

function parseMedia(value: unknown): SystemEvidenceMedia | null {
  const media = asRecord(value);
  const point = parsePoint(media);
  const type = media?.type;
  const url = asText(media?.url);

  if (!point || (type !== "image" && type !== "video") || !url) return null;

  const name = asText(media?.name);
  return {
    ...point,
    type,
    url,
    ...(name ? { name } : {}),
  };
}

function parseDate(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDetailUrl(value: unknown, fallback: string) {
  const url = asText(value);
  return url.startsWith("/") && !url.startsWith("//") ? url : fallback;
}

export function parseSystemEvidenceResponse(payload: unknown): SystemEvidenceIssue[] {
  const envelope = asRecord(payload);
  const rows = Array.isArray(envelope?.data) ? envelope.data : Array.isArray(payload) ? payload : [];

  return rows.flatMap((value) => {
    const row = asRecord(value);
    if (!row) return [];

    const issueId = asText(row.issueId ?? row.id);
    if (!issueId) return [];

    const sourceType: SystemEvidenceSourceType = row.sourceType === "feedback" ? "feedback" : "issue";
    const fallbackDetailUrl = sourceType === "feedback"
      ? "/citizen-feed"
      : `/report-issue/${encodeURIComponent(issueId)}`;

    const location = asRecord(row.location);
    const evidence = Array.isArray(row.evidence)
      ? row.evidence.map(parseMedia).filter((item): item is SystemEvidenceMedia => item !== null)
      : [];
    const geoVideoTrack = Array.isArray(row.geoVideoTrack)
      ? row.geoVideoTrack.map(parsePoint).filter((point): point is SystemEvidencePoint => point !== null)
      : [];

    if (evidence.length === 0 && geoVideoTrack.length === 0) return [];

    return [{
      issueId,
      sourceType,
      detailUrl: parseDetailUrl(row.detailUrl, fallbackDetailUrl),
      ticketNumber: asText(row.ticketNumber, "Unnumbered report"),
      category: asText(row.category ?? row.issueType, "Uncategorized"),
      status: asText(row.status, "pending").toLowerCase(),
      description: asText(row.description ?? row.issueDescription, "No description provided."),
      createdAt: parseDate(row.createdAt),
      location: {
        region: asText(location?.region ?? row.region),
        province: asText(location?.province ?? row.province),
        municipality: asText(location?.municipality ?? location?.city ?? row.municipality ?? row.city),
        barangay: asText(location?.barangay ?? row.barangay),
      },
      evidence,
      geoVideoTrack,
      geoVideoUrl: asText(row.geoVideoUrl) || null,
    }];
  });
}

export function getSystemEvidenceIssuePosition(issue: SystemEvidenceIssue): [number, number] | null {
  const firstEvidence = issue.evidence[0];
  if (firstEvidence) return [firstEvidence.lat, firstEvidence.lon];

  const firstTrackPoint = issue.geoVideoTrack[0];
  return firstTrackPoint ? [firstTrackPoint.lat, firstTrackPoint.lon] : null;
}

export function getSystemEvidenceLocationLabel(issue: SystemEvidenceIssue) {
  return [
    issue.location.barangay,
    issue.location.municipality,
    issue.location.province,
    issue.location.region,
  ].filter(Boolean).join(", ") || "Location not specified";
}

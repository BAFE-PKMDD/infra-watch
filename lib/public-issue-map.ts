import { publicEvidencePath } from "@/lib/public-issue-dto";
import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

const MAX_PUBLIC_DESCRIPTION_CHARS = 240;

export type PublicIssueMapRow = {
  id: string;
  ticketNumber: string;
  category: string;
  status: string;
  publicDescription: string | null;
  publicApprovedAt: Date | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  latitude: number | null;
  longitude: number | null;
  evidence: StoredIssueEvidenceItem[] | null;
  createdAt: Date;
};

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/**
 * Evidence-map entry for an E-Report whose public summary was approved by staff.
 * Only photos are shown, through the metadata-stripping proxy; videos, GPS tracks,
 * and reporter details are never included. Reports are made on site at the project,
 * so the photo location and the place name are published as recorded.
 * Returns null when the report is unpublished or has no usable photo location.
 */
export function buildPublicIssueMapEntry(row: PublicIssueMapRow) {
  if (!row.publicApprovedAt || !row.publicDescription?.trim()) return null;

  const evidence = (Array.isArray(row.evidence) ? row.evidence : []).flatMap((item, index) => {
    if (item.type !== "image") return [];
    const lat = isCoordinate(item.lat, 90) ? item.lat : row.latitude;
    const lon = isCoordinate(item.lon, 180) ? item.lon : row.longitude;
    if (!isCoordinate(lat, 90) || !isCoordinate(lon, 180)) return [];
    return [{
      type: "image" as const,
      url: publicEvidencePath(row.id, index),
      lat,
      lon,
    }];
  });
  if (evidence.length === 0) return null;

  return {
    issueId: `issue:${row.id}`,
    sourceType: "issue" as const,
    detailUrl: `/report-issue/${encodeURIComponent(row.id)}`,
    ticketNumber: row.ticketNumber,
    category: row.category,
    status: row.status,
    description: row.publicDescription.trim().slice(0, MAX_PUBLIC_DESCRIPTION_CHARS),
    createdAt: row.createdAt,
    location: {
      region: row.region ?? "",
      province: row.province ?? "",
      municipality: row.municipality ?? "",
      barangay: row.barangay ?? "",
    },
    evidence,
    geoVideoTrack: null,
    geoVideoUrl: null,
  };
}

/**
 * A single geographic sample associated with captured media.
 */
export interface GeoTrackPoint {
  lat: number;
  lon: number;
  accuracy?: number;
  timeSeconds?: number;
}

/**
 * Evidence attached to an issue report.
 *
 * `track` is accepted on submission so the API can select the first tracked
 * video deterministically. The selected track is persisted in the issue's
 * dedicated `geoVideoTrack` column rather than inside the evidence JSONB.
 */
export interface IssueEvidenceItem {
  type: "image" | "video" | "document";
  url: string;
  name?: string;
  lat?: number;
  lon?: number;
  accuracy?: number;
  track?: GeoTrackPoint[];
}

/**
 * `publicApprovedAt` is set only by staff (never accepted from a submission)
 * and marks an image as cleared for the public report page and feed.
 */
export type StoredIssueEvidenceItem = Omit<IssueEvidenceItem, "track"> & {
  publicApprovedAt?: string;
  publicApprovedBy?: string;
};

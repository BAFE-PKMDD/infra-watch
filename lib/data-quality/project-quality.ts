export const DATA_QUALITY_ISSUE_TYPES = [
  "missing_approved_budget",
  "missing_actual_bid_amount",
  "bid_exceeds_approved_budget",
  "missing_location",
  "invalid_coordinates",
  "duplicate_project_code",
  "stale_source_record",
] as const;

export type DataQualityIssueType = (typeof DATA_QUALITY_ISSUE_TYPES)[number];
export type DataQualitySeverity = "critical" | "warning" | "info";

export type DataQualityProject = {
  id: string;
  abemisId: string;
  projectCode: string | null;
  name: string;
  status: string;
  budget: string | null;
  abc: number | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  latitude: number | null;
  longitude: number | null;
  lastSyncedAt: Date;
};

export type DataQualityIssue = {
  type: DataQualityIssueType;
  severity: DataQualitySeverity;
  field: keyof DataQualityProject | "source";
  currentValue: unknown;
  message: string;
  recommendation: string;
};

export function analyzeProjectDataQuality(project: DataQualityProject): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const approvedBudget = parseMoney(project.budget);
  const actualBidAmount = project.abc;

  if (approvedBudget === null || approvedBudget <= 0) {
    issues.push({
      type: "missing_approved_budget",
      severity: "critical",
      field: "budget",
      currentValue: project.budget,
      message: "The approved budget is missing or not greater than zero.",
      recommendation: "Verify the approved budget against the authoritative allocation or approval document.",
    });
  }

  if (actualBidAmount === null || actualBidAmount <= 0) {
    issues.push({
      type: "missing_actual_bid_amount",
      severity: "info",
      field: "abc",
      currentValue: actualBidAmount,
      message: "The supplier's actual bid amount is not available. This may be expected before bidding.",
      recommendation: "Verify whether bidding has occurred and, if applicable, confirm the amount from authoritative procurement records.",
    });
  }

  if (approvedBudget !== null && actualBidAmount !== null && actualBidAmount > approvedBudget) {
    issues.push({
      type: "bid_exceeds_approved_budget",
      severity: "warning",
      field: "abc",
      currentValue: actualBidAmount,
      message: "The supplier's actual bid amount is greater than the approved budget.",
      recommendation: "Review the approved budget and supplier bid against their authoritative documents; do not infer a replacement amount.",
    });
  }

  if (![project.region, project.province, project.municipality, project.barangay].some(hasText)) {
    issues.push({
      type: "missing_location",
      severity: "warning",
      field: "region",
      currentValue: null,
      message: "No region, province, municipality, or barangay is available.",
      recommendation: "Verify the project location against the authoritative project record and source system.",
    });
  }

  if (!hasValidCoordinates(project.latitude, project.longitude)) {
    const invalidField = isValidLatitude(project.latitude) ? "longitude" : "latitude";
    issues.push({
      type: "invalid_coordinates",
      severity: "warning",
      field: invalidField,
      currentValue: { latitude: project.latitude, longitude: project.longitude },
      message: "Coordinates are missing, incomplete, or outside valid latitude/longitude bounds.",
      recommendation: "Verify both coordinates against authoritative geotagging or project-location evidence.",
    });
  }

  return issues;
}

export function isStaleSourceRecord(lastSyncedAt: Date, latestSuccessfulSyncStartedAt: Date | null) {
  return latestSuccessfulSyncStartedAt !== null && lastSyncedAt < latestSuccessfulSyncStartedAt;
}

export function buildProjectGeometry(latitude: number | null, longitude: number | null) {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

function parseMoney(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasText(value: string | null) {
  return Boolean(value?.trim());
}

function hasValidCoordinates(latitude: number | null, longitude: number | null) {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

function isValidLatitude(latitude: number | null): latitude is number {
  return latitude !== null && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

function isValidLongitude(longitude: number | null): longitude is number {
  return longitude !== null && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

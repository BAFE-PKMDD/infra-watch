import { formatBudgetDetailed } from "@/lib/format";
import type { DataQualityIssue, DataQualityIssueType, DataQualitySeverity } from "./project-quality";

export const ISSUE_LABELS: Record<DataQualityIssueType, string> = {
  missing_approved_budget: "Missing approved budget",
  missing_actual_bid_amount: "Missing supplier bid amount",
  bid_exceeds_approved_budget: "Bid exceeds approved budget",
  missing_location: "Missing location",
  invalid_coordinates: "Invalid coordinates",
  duplicate_project_code: "Duplicate project code",
  stale_source_record: "Not seen in latest successful sync",
};

// Every finding of a given type is always raised at the same severity today
// (see lib/data-quality/project-quality.ts and service.ts); kept here as the
// one shared lookup so presentation code doesn't re-derive it per finding.
export const ISSUE_SEVERITY: Record<DataQualityIssueType, DataQualitySeverity> = {
  missing_approved_budget: "critical",
  missing_actual_bid_amount: "info",
  bid_exceeds_approved_budget: "warning",
  missing_location: "warning",
  invalid_coordinates: "warning",
  duplicate_project_code: "critical",
  stale_source_record: "warning",
};

const MONEY_FINDING_TYPES = new Set<DataQualityIssueType>([
  "missing_approved_budget",
  "missing_actual_bid_amount",
  "bid_exceeds_approved_budget",
]);

export function formatFindingCurrentValue(type: DataQualityIssueType, currentValue: unknown): string {
  if (currentValue === null || currentValue === undefined || currentValue === "") return "Missing";

  if (MONEY_FINDING_TYPES.has(type)) {
    const amount = typeof currentValue === "number" ? currentValue : Number(currentValue);
    return Number.isFinite(amount) && amount > 0 ? formatBudgetDetailed(amount) : "Missing";
  }

  if (type === "stale_source_record") {
    const syncedAt = currentValue instanceof Date ? currentValue : new Date(String(currentValue));
    return Number.isNaN(syncedAt.getTime())
      ? String(currentValue)
      : syncedAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  }

  if (type === "invalid_coordinates" && typeof currentValue === "object") {
    const { latitude, longitude } = currentValue as { latitude: number | null; longitude: number | null };
    if (latitude === null && longitude === null) return "Missing";
    return `Latitude ${latitude ?? "missing"}, longitude ${longitude ?? "missing"}`;
  }

  if (typeof currentValue === "object") return JSON.stringify(currentValue);
  return String(currentValue);
}

// Maps a finding's internal field name to the actual field name ABEMIS uses in its API,
// so a correction spreadsheet can be matched back against the source system directly.
export const FIELD_ABEMIS_NAMES: Partial<Record<DataQualityIssue["field"], string>> = {
  budget: "allocated_amount",
  abc: "abc",
  region: "region",
  latitude: "latitude",
  longitude: "longitude",
  projectCode: "project_id",
};

export const EXPORT_FIELD_ORDER = ["allocated_amount", "abc", "region", "latitude", "longitude", "project_id"] as const;

export function formatFieldValueForField(issue: { type: DataQualityIssueType; field: string; currentValue: unknown }): string {
  if (issue.type === "invalid_coordinates" && typeof issue.currentValue === "object" && issue.currentValue !== null) {
    const { latitude, longitude } = issue.currentValue as { latitude: number | null; longitude: number | null };
    const value = issue.field === "longitude" ? longitude : latitude;
    return value === null || value === undefined ? "Missing" : String(value);
  }
  return formatFindingCurrentValue(issue.type, issue.currentValue);
}

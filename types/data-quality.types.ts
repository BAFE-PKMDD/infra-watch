export type DataQualityIssueType =
  | "missing_approved_budget"
  | "missing_actual_bid_amount"
  | "bid_exceeds_approved_budget"
  | "missing_location"
  | "invalid_coordinates"
  | "duplicate_project_code"
  | "stale_source_record";

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
  lastSyncedAt: string;
};

export type DataQualityIssueRow = {
  project: DataQualityProject;
  findings: Array<{
    type: DataQualityIssueType;
    severity: "critical" | "warning" | "info";
    field: string;
    currentValue: unknown;
    message: string;
    recommendation: string;
  }>;
};

export type DataQualityReport = {
  summary: {
    totalProjectsScanned: number;
    projectsWithFindings: number;
    totalIssues: number;
    critical: number;
    warning: number;
    info: number;
    cleanupCandidateCount: number;
    latestSuccessfulSyncStartedAt: string | null;
    issueCounts: Record<DataQualityIssueType, number>;
  };
  issues: DataQualityIssueRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  cleanupExecutionEnabled: false;
};

import type { IssueActivityItem } from "@/types/activity-feed.types";
import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";
import { sanitizePublicIssueEvidence } from "@/lib/public-issue-dto";

export type PublicIssueActivityRow = {
  id: string;
  category: string;
  status: string;
  description: string | null;
  province: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  projectName: string | null;
  projectAbemisId: string | null;
  evidence?: StoredIssueEvidenceItem[] | null;
};

function normalizeIssueStatus(status: string): IssueActivityItem["status"] {
  if (status === "reviewing" || status === "resolved" || status === "closed") {
    return status;
  }
  return "pending";
}

function normalizeIssueType(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("damage")) return "damage";
  if (lower.includes("delay") || lower.includes("stopped") || lower.includes("stalled")) return "stopped";
  if (lower.includes("safety") || lower.includes("hazard")) return "safety";
  if (lower.includes("flood") || lower.includes("water")) return "flooding";
  if (lower.includes("block")) return "blocked";
  if (lower.includes("quality")) return "quality";
  return "other";
}

export function formatPublicIssueActivity(row: PublicIssueActivityRow): IssueActivityItem {
  return {
    type: "issue",
    id: row.id,
    issueType: normalizeIssueType(row.category),
    issueDescription: row.description ?? "",
    status: normalizeIssueStatus(row.status),
    province: row.province ?? "",
    city: "",
    barangay: "",
    responseCount: 0,
    recentResponses: [],
    images: sanitizePublicIssueEvidence(row.evidence ?? null, row.id).map((item) => item.url),
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    project: row.projectAbemisId && row.projectName
      ? { id: row.projectAbemisId, name: row.projectName }
      : null,
  };
}

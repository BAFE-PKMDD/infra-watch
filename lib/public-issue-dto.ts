import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

export function sanitizePublicIssueEvidence(
  evidence: StoredIssueEvidenceItem[] | null,
): Array<Pick<StoredIssueEvidenceItem, "type" | "url">> {
  void evidence;
  // Evidence has no explicit publication-approval flag yet. Keep it private
  // rather than exposing original media that may contain embedded location data.
  return [];
}

export type CitizenVisibleIssueResponse = {
  id: string;
  message: string;
  statusChange: string | null;
  newStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function sanitizeCitizenIssueResponses(
  responses: CitizenVisibleIssueResponse[],
) {
  return responses.map((response) => ({
    id: response.id,
    message: response.message,
    statusChange: response.newStatus,
    newStatus: response.newStatus,
    attachmentUrls: [],
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    responder: {
      name: "InfraWatch staff",
      role: "staff",
    },
    responderName: "InfraWatch staff",
  }));
}

export type PublicIssueRow = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  category: string;
  status: string;
  publicDescription: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  evidence: StoredIssueEvidenceItem[] | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectName: string | null;
};

function toPublicStatus(status: string) {
  if (status === "reviewing") return "in-progress";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "suspended";
  return "pending";
}

export function formatPublicIssue(row: PublicIssueRow) {
  const evidence = sanitizePublicIssueEvidence(row.evidence);
  const firstImage = evidence.find((item) => item.type === "image");

  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    projectId: row.projectId,
    projectName: row.projectName ?? "Unlinked Infrastructure Report",
    category: row.category,
    issueType: row.category,
    description: row.publicDescription ?? "",
    issueDescription: row.publicDescription ?? "",
    status: toPublicStatus(row.status),
    fmrStatus: row.status === "submitted" ? "pending" : row.status,
    date: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    region: row.region ?? "",
    province: row.province ?? "",
    city: "",
    municipality: "",
    barangay: "",
    evidence,
    photoUrls: evidence.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: evidence.filter((item) => item.type === "video").map((item) => item.url),
    documentUrls: evidence.filter((item) => item.type === "document").map((item) => item.url),
    photoUrl: firstImage?.url ?? null,
    dateNoticed: row.createdAt,
    resolvedAt: row.resolvedAt,
    project: row.projectName ? {
      id: row.projectId,
      name: row.projectName,
      code: row.projectId,
    } : null,
    comments: [],
  };
}

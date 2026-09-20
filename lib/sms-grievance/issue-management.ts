import type { SmsMockScenario } from "@/types/sms-grievance.types";

export type PrototypeAdminIssue = {
  id: string;
  ticketNumber: string;
  projectName: string | null;
  issueType: string;
  issueDescription: string;
  status: "pending" | "reviewing" | "resolved" | "closed";
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  reporterName: "*** *** ****";
  isAnonymous: boolean;
  createdAt: string;
  source: "sms_prototype";
  sourceLabel: "SMS Grievance, sample only";
  prototype: true;
};

function toIssueStatus(status: SmsMockScenario["status"]): PrototypeAdminIssue["status"] {
  if (status === "under_review") return "reviewing";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "closed";
  return "pending";
}

export function toPrototypeAdminIssue(record: SmsMockScenario): PrototypeAdminIssue {
  return {
    id: record.id,
    ticketNumber: `[SAMPLE TRACKING ${record.id.slice(-3)}]`,
    projectName: record.projectMatch === "confirmed" ? record.projectLabel : null,
    issueType: record.categoryLabel,
    issueDescription: record.originalText,
    status: toIssueStatus(record.status),
    province: "",
    city: "",
    barangay: "",
    streetLandmark: record.locationLabel,
    reporterName: "*** *** ****",
    isAnonymous: record.senderMode === "anonymous",
    createdAt: record.receivedAt,
    source: "sms_prototype",
    sourceLabel: "SMS Grievance, sample only",
    prototype: true,
  };
}

export function getPrototypeAcceptedIssues(records: SmsMockScenario[]) {
  return records.filter((record) => record.relevance === "confirmed_in_scope").map(toPrototypeAdminIssue);
}

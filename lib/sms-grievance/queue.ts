import type { SmsMockScenario } from "@/types/sms-grievance.types";

export type QueueFilter = "all" | "needs_review" | "accepted" | "unrelated" | "duplicate" | "restricted" | "urgent";

export const QUEUE_FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "all", label: "All sample messages" },
  { value: "needs_review", label: "Needs checking" },
  { value: "accepted", label: "Ready as a case" },
  { value: "unrelated", label: "Not a BAFE project" },
  { value: "duplicate", label: "Possible copy" },
  { value: "restricted", label: "Limited access" },
  { value: "urgent", label: "Needs urgent attention" },
];

export function filterSmsReviewRecords(records: SmsMockScenario[], filter: QueueFilter) {
  if (filter === "needs_review") return records.filter((item) => item.status === "needs_relevance_review");
  if (filter === "accepted") return records.filter((item) => item.relevance === "confirmed_in_scope");
  if (filter === "unrelated") return records.filter((item) => item.relevance === "out_of_scope");
  if (filter === "duplicate") return records.filter((item) => item.relevance === "duplicate");
  if (filter === "restricted") return records.filter((item) => item.sensitive);
  if (filter === "urgent") return records.filter((item) => item.urgentReview);
  return records;
}

export function smsStatusLabel(item: SmsMockScenario) {
  if (item.projectMatch === "not_bafe_project") return "Not a BAFE project";
  if (item.relevance === "out_of_scope") return "Not for InfraWatch";
  if (item.relevance === "duplicate") return "Possible copy";
  if (item.status === "needs_relevance_review") return "Needs checking";
  if (item.status === "pending_review") return "Waiting for review";
  if (item.status === "under_review") return "Being reviewed";
  if (item.status === "resolved") return "Resolved";
  return "Closed";
}

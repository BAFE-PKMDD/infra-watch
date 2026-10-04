import type { SmsCaseStatus, SmsMockScenario } from "@/types/sms-grievance.types";

export type QueueFilter = "all" | "needs_review" | "accepted" | "unrelated" | "restricted" | "urgent";

export const QUEUE_FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "all", label: "All messages" },
  { value: "needs_review", label: "Needs checking" },
  { value: "accepted", label: "Ready as a case" },
  { value: "unrelated", label: "Not a BAFE project" },
  { value: "restricted", label: "Limited access" },
  { value: "urgent", label: "Needs urgent attention" },
];

export function filterSmsReviewRecords(records: SmsMockScenario[], filter: QueueFilter) {
  // A message linked into another case isn't a separate thing anymore — its content now
  // lives in the thread it was linked to, so it's excluded from every queue view, not
  // just the default one. There's no dedicated filter for these; the only way to see one
  // is from the case it was linked into.
  const visible = records.filter((item) => item.relevance !== "duplicate");
  if (filter === "needs_review") return visible.filter((item) => item.status === "needs_relevance_review");
  if (filter === "accepted") return visible.filter((item) => item.relevance === "confirmed_in_scope");
  if (filter === "unrelated") return visible.filter((item) => item.relevance === "out_of_scope");
  if (filter === "restricted") return visible.filter((item) => item.sensitive);
  if (filter === "urgent") return visible.filter((item) => item.urgentReview);
  // "All messages" means every message that could still be an InfraWatch/BAFE matter —
  // one already tagged "Not a BAFE project" isn't that anymore, so it's left to its own
  // dedicated filter instead of cluttering the default view a second time.
  return visible.filter((item) => item.relevance !== "out_of_scope");
}

export const SMS_CASE_STATUS_LABELS: Record<SmsCaseStatus, string> = {
  imported: "Imported",
  needs_relevance_review: "Needs checking",
  under_review: "Being reviewed",
  resolved: "Resolved",
  closed: "Closed",
};

export function smsStatusLabel(item: SmsMockScenario) {
  if (item.projectMatch === "not_bafe_project") return "Not a BAFE project";
  if (item.relevance === "out_of_scope") return "Not for InfraWatch";
  if (item.relevance === "duplicate") return "Possible copy";
  return SMS_CASE_STATUS_LABELS[item.status];
}

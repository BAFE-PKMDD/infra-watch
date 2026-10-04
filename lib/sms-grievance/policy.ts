import type { SmsAction, SmsCaseStatus, SmsConversationItem } from "@/types/sms-grievance.types";

const ALLOWED_TRANSITIONS: Record<SmsCaseStatus, readonly SmsCaseStatus[]> = {
  imported: ["needs_relevance_review"],
  // Accepting a message (prototype-state.ts's "accept" action) already moves it straight
  // to "under_review" — there's no separate "waiting for review" stop in between, since
  // tagging a case to a project and region already means staff is actively on it.
  needs_relevance_review: ["under_review"],
  under_review: ["resolved"],
  resolved: ["closed", "under_review"],
  closed: ["under_review"],
};

const ACTION_REQUIREMENTS: Record<SmsAction, readonly string[]> = {
  accept: ["sourceBackedBafeProject", "category", "location", "responsibleOffice", "region", "relevanceReason", "staffConfirmation"],
  mark_not_bafe_project: ["category", "reason", "staffConfirmation"],
  mark_unrelated: ["reason"],
  assign_project: ["sourceBackedProject", "staffConfirmation"],
  resolve: ["outcomeSummary", "responsibleOffice"],
  close: ["closureReason", "supervisorAuthorization"],
  reopen: ["reason"],
  restrict: ["reason", "restrictedCaseAuthorization"],
  reveal_contact: ["operationalReason", "contactRevealAuthorization"],
  redact: ["fields", "reason"],
  archive: ["reason"],
  mark_duplicate: ["reason", "canonicalRecord"],
};

export function canTransitionSmsCase(current: SmsCaseStatus, target: SmsCaseStatus) {
  return ALLOWED_TRANSITIONS[current].includes(target);
}

export function nextSmsCaseStatuses(current: SmsCaseStatus): readonly SmsCaseStatus[] {
  return ALLOWED_TRANSITIONS[current];
}

export function getSmsActionRequirement(action: SmsAction) {
  return [...ACTION_REQUIREMENTS[action]];
}

export function isOutboundConversationItem(item: Pick<SmsConversationItem, "kind">) {
  return item.kind === "outbound_sms";
}

export function canUseSmsPrototype(input: { nodeEnv: string | undefined; canManageIssues: boolean }) {
  return input.nodeEnv !== "production" && input.canManageIssues;
}

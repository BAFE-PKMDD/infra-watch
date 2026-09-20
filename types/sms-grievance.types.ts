export type SmsPrototypeScenario =
  | "anonymous_valid"
  | "identified_valid"
  | "exact_project"
  | "location_only"
  | "malformed"
  | "unrelated"
  | "duplicate_import"
  | "follow_up"
  | "restricted_misconduct"
  | "possible_danger"
  | "pending_acknowledgment"
  | "failed_response";

export type SmsCaseStatus =
  | "imported"
  | "needs_relevance_review"
  | "pending_review"
  | "under_review"
  | "resolved"
  | "closed";

export type SmsRelevanceStatus = "uncertain" | "confirmed_in_scope" | "out_of_scope" | "duplicate";

export type SmsCategory =
  | "project_delay"
  | "damaged_infrastructure"
  | "construction_quality"
  | "safety_hazard"
  | "flooding_drainage"
  | "blocked_access"
  | "budget_procurement_payment"
  | "misconduct_corruption"
  | "incorrect_project_information"
  | "other_infrastructure";

export type SmsDeliveryStatus = "not_requested" | "simulated_pending" | "simulated_delivered" | "simulated_failed";

export type SmsConversationKind = "inbound_sms" | "outbound_sms" | "internal_note" | "status_event";

export type SmsConversationItem = {
  id: string;
  kind: SmsConversationKind;
  body: string;
  occurredAt: string;
  deliveryStatus?: SmsDeliveryStatus;
};

export type SmsProjectTag = {
  id: string;
  name: string;
  code?: string;
  province?: string;
  municipality?: string;
};

export type SmsMockScenario = {
  id: string;
  scenario: SmsPrototypeScenario;
  prototype: true;
  externalMessageId: string;
  conversationId: string;
  duplicateOf?: string;
  receivedAt: string;
  originalText: string;
  maskedContact: "*** *** ****";
  senderMode: "anonymous" | "identified";
  relevance: SmsRelevanceStatus;
  relevanceReason: string;
  status: SmsCaseStatus;
  category: SmsCategory | null;
  categoryLabel: string;
  locationLabel: string;
  projectLabel: string;
  projectMatch: "confirmed" | "candidate" | "not_identified" | "not_bafe_project";
  projectId?: string;
  projectCode?: string;
  projectProvince?: string;
  projectMunicipality?: string;
  assignedUnit?: string;
  assignedRegion?: string;
  sensitive: boolean;
  urgentReview: boolean;
  deliveryStatus: SmsDeliveryStatus;
  language: "English" | "Filipino" | "Regional language";
  conversation: SmsConversationItem[];
};

export type SmsAction =
  | "accept"
  | "mark_not_bafe_project"
  | "mark_unrelated"
  | "assign_project"
  | "resolve"
  | "close"
  | "reopen"
  | "restrict"
  | "reveal_contact"
  | "redact"
  | "archive"
  | "mark_duplicate";

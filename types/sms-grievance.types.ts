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
  | "failed_response"
  | "live_import"
  | "auto_acknowledgment_demo"
  | "staff_simulated_incoming";

export type SmsCaseStatus =
  | "imported"
  | "needs_relevance_review"
  | "under_review"
  | "resolved"
  | "closed";

export type SmsRelevanceStatus = "uncertain" | "confirmed_in_scope" | "out_of_scope" | "duplicate";

// The SMS grievance line receives every text sent to it, not just BAFE-related ones, so
// "not a BAFE project" covers two genuinely different situations that call for different
// replies to the sender: a message with nothing to do with any project at all, versus a
// real project complaint that belongs to a different government agency.
export type SmsNotBafeCategory = "not_related_to_infrawatch" | "different_agency_project";

// Shares the same issue-type catalog as E-Report and Feedback (ISSUE_TYPES in
// lib/abemis/issue-type-map.ts), plus a few SMS-specific additions those identified,
// citizen-facing forms don't need (see lib/sms-grievance/categories.ts for the combined
// list and labels). No fixed enum backs this in the real app either — report_issues and
// feedback both store their category as free text, not a DB-level enum.
export type SmsCategory = string;

// "simulated_*" means nothing left this app — the prototype actions in prototype-state.ts
// and the static fixtures in mock-fixtures.ts always use these. "sent"/"send_failed" mean
// a real SMS gateway call was actually made (see simulate-incoming.ts + lib/sms.ts) — only
// possible for a staff-simulated test message using a real phone number the staff member
// owns, never for a static fixture or a real citizen's live-feed number.
export type SmsDeliveryStatus = "not_requested" | "simulated_pending" | "simulated_delivered" | "simulated_failed" | "sent" | "send_failed";

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

export type SmsCoordinates = {
  lat: number;
  lng: number;
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
  contactNumber: string;
  senderMode: "anonymous" | "identified";
  relevance: SmsRelevanceStatus;
  relevanceReason: string;
  status: SmsCaseStatus;
  category: SmsCategory | null;
  categoryLabel: string;
  locationLabel: string;
  coordinates?: SmsCoordinates | null;
  projectLabel: string;
  projectMatch: "confirmed" | "candidate" | "not_identified" | "not_bafe_project";
  projectId?: string;
  projectCode?: string;
  projectProvince?: string;
  projectMunicipality?: string;
  assignedUnit?: string;
  assignedRegion?: string;
  // Minted once a message is confirmed as a BAFE project and routed to a region — the
  // sender's reference number for the SMS reply thread, distinct from the intake-time
  // externalMessageId a message is given the moment it's received.
  smsGrievanceCaseId?: string;
  // Set only when projectMatch is "not_bafe_project" — which of the two reasons applies,
  // so the auto-reply and any later reporting can tell "not our channel at all" apart
  // from "a real project complaint, just for a different agency".
  notBafeCategory?: SmsNotBafeCategory;
  // True only for a record staff created at runtime with "Simulate incoming message"
  // (e.g. using their own phone number to test the flow end-to-end). Never present on a
  // static fixture or a real live-feed record, and never persisted anywhere but the
  // reviewing staff member's own browser storage.
  localSimulated?: boolean;
  sensitive: boolean;
  urgentReview: boolean;
  deliveryStatus: SmsDeliveryStatus;
  language: "English" | "Filipino" | "Regional language" | "Unknown";
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

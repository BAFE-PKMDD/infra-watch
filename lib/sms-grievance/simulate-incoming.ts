import { buildAcknowledgmentReply } from "@/lib/sms-grievance/auto-response";
import type { SmsConversationItem, SmsMockScenario } from "@/types/sms-grievance.types";

// Every record this tool creates gets this id prefix so mock-store.ts can recognize it as
// a deliberately staff-created test message rather than a real live-feed or fixture record.
export const LOCAL_SIMULATED_ID_PREFIX = "local-sms-";

export type SimulateIncomingInput = {
  contactNumber: string;
  originalText: string;
  locationLabel?: string;
};

function requireField(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

// Lets staff test the full intake flow — auto-acknowledgment through classification and
// close — against a real phone number of their own, without ever writing that number into
// a git-tracked file: the record this returns is only ever kept in the reviewing staff
// member's own browser storage (see mock-store.ts), the same way any other local review
// decision is.
export function createSimulatedIncomingMessage(input: SimulateIncomingInput, existingRecords: SmsMockScenario[]): SmsMockScenario {
  const contactNumber = requireField(input.contactNumber, "Phone number");
  const originalText = requireField(input.originalText, "Message text");
  const locationLabel = input.locationLabel?.trim() || "Location not provided";

  const sequence = existingRecords.filter((record) => record.localSimulated).length + 1;
  const sequenceLabel = String(sequence).padStart(4, "0");
  const id = `${LOCAL_SIMULATED_ID_PREFIX}${sequenceLabel}-${Date.now()}`;
  const externalMessageId = `SIM-${sequenceLabel}`;
  const receivedAt = new Date().toISOString();

  return {
    id,
    scenario: "staff_simulated_incoming",
    prototype: true,
    localSimulated: true,
    externalMessageId,
    conversationId: `local-conversation-${sequenceLabel}`,
    receivedAt,
    originalText,
    contactNumber,
    senderMode: "identified",
    relevance: "uncertain",
    relevanceReason: "Staff-simulated incoming message for testing the auto-acknowledgment and routing flow. Needs the same review as any other message.",
    status: "needs_relevance_review",
    category: null,
    categoryLabel: "Not yet classified",
    locationLabel,
    projectLabel: "Not yet identified",
    projectMatch: "not_identified",
    sensitive: false,
    urgentReview: false,
    // "simulated_pending" until the caller actually sends this over the real SMS gateway
    // and learns whether it succeeded (see sms-grievance-table.tsx + the
    // sendSimulatedAcknowledgmentSms server action) — this function itself makes no
    // network call, so it can't yet say "sent" or "send_failed".
    deliveryStatus: "simulated_pending",
    language: "Unknown",
    conversation: [
      {
        id: `${id}-inbound`,
        kind: "inbound_sms",
        body: originalText,
        occurredAt: receivedAt,
        deliveryStatus: "not_requested",
      },
      {
        id: `${id}-outbound-ack`,
        kind: "outbound_sms",
        body: buildAcknowledgmentReply(externalMessageId),
        occurredAt: receivedAt,
        deliveryStatus: "simulated_pending",
      },
    ],
  };
}

// A contact number that can't actually identify a sender — the masked placeholder every
// static sample fixture shares ("09*******89") or the live feed's literal "Not provided"
// for a missing sender — so it should never drive a thread match. Matching on either
// would wrongly link together unrelated messages that only coincidentally share the
// same stand-in value.
function isIdentifyingContact(contactNumber: string) {
  return contactNumber.trim().length > 0 && !contactNumber.includes("*") && contactNumber !== "Not provided";
}

// Finds the most recently active other record from the same sender, for staff to review
// and decide whether to link this message into that case instead of treating it as a new
// one — this is a review-time decision (see the "same sender" suggestion in
// sms-grievance-detail-view.tsx), not something decided automatically the moment a
// message is received, since a real incoming message has no step where anyone could make
// that call before it reaches the review queue.
export function findLatestThreadForContact(records: SmsMockScenario[], contactNumber: string, excludeId?: string): SmsMockScenario | null {
  if (!isIdentifyingContact(contactNumber)) return null;
  const trimmed = contactNumber.trim();
  const matches = records.filter((record) => record.id !== excludeId && record.contactNumber === trimmed);
  if (matches.length === 0) return null;
  return matches.reduce((latest, candidate) => (
    new Date(candidate.receivedAt).getTime() > new Date(latest.receivedAt).getTime() ? candidate : latest
  ));
}

// A short real reply for a message that joins an existing thread — the full
// Project Type/Name/Age/Gender/Location request (buildAcknowledgmentReply) already went
// out once for this ticket, so asking again on every follow-up would be redundant.
export function buildFollowUpAcknowledgment(ticketId: string): string {
  return `Natanggap po namin ang karagdagang mensahe ninyo para sa Ticket Blg. ${ticketId}. Idinagdag na ito sa parehong ulat. Maraming salamat.`;
}

// Appends a new inbound message to an existing staff-simulated thread instead of creating
// a separate case for it — matching how multiple messages from the same number should
// land in one thread rather than scattering across the queue. A thread that was already
// resolved or closed reopens to "under_review" (the only state both of those can move to
// — see policy.ts's ALLOWED_TRANSITIONS) with a status event recording why.
export function appendFollowUpMessage(thread: SmsMockScenario, originalText: string): SmsMockScenario {
  const text = requireField(originalText, "Message text");
  const now = new Date().toISOString();
  const wasClosedOrResolved = thread.status === "resolved" || thread.status === "closed";
  const baseIndex = thread.conversation.length;

  const newItems: SmsConversationItem[] = [
    {
      id: `${thread.id}-followup-inbound-${baseIndex + 1}`,
      kind: "inbound_sms",
      body: text,
      occurredAt: now,
      deliveryStatus: "not_requested",
    },
    {
      id: `${thread.id}-followup-outbound-${baseIndex + 2}`,
      kind: "outbound_sms",
      body: buildFollowUpAcknowledgment(thread.externalMessageId),
      occurredAt: now,
      deliveryStatus: "simulated_pending",
    },
  ];

  if (wasClosedOrResolved) {
    newItems.push({
      id: `${thread.id}-followup-status-${baseIndex + 3}`,
      kind: "status_event",
      body: `Reopened — a new message arrived from the same sender after this case was ${thread.status}.`,
      occurredAt: now,
    });
  }

  return {
    ...thread,
    receivedAt: now,
    status: wasClosedOrResolved ? "under_review" : thread.status,
    deliveryStatus: "simulated_pending",
    conversation: [...thread.conversation, ...newItems],
  };
}

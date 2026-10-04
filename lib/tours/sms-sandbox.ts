import type { SmsMockScenario } from "@/types/sms-grievance.types";
import { applySmsPrototypeAction } from "@/lib/sms-grievance/prototype-state";

export const TUTORIAL_SMS_ID = "tutorial-example-sms";

export function createTutorialSms(): SmsMockScenario {
  const date = new Date().toISOString();
  const text = "Tutorial example: the canal lining near our access road needs inspection. Is there an update?";
  return {
    id: TUTORIAL_SMS_ID, scenario: "exact_project", prototype: true, localSimulated: false,
    externalMessageId: "TUTORIAL-SMS-001", conversationId: "tutorial-conversation", receivedAt: date, originalText: text,
    contactNumber: "09*******89", senderMode: "anonymous", relevance: "confirmed_in_scope", relevanceReason: "Example already reviewed and routed for this response guide.",
    status: "under_review", category: "quality", categoryLabel: "Project Quality", locationLabel: "Example municipality",
    projectLabel: "Example irrigation canal", projectMatch: "confirmed", assignedUnit: "Example regional office", assignedRegion: "Example region",
    sensitive: false, urgentReview: false, deliveryStatus: "not_requested", language: "English",
    conversation: [{ id: "tutorial-sms-inbound", kind: "inbound_sms", body: text, occurredAt: date }],
  };
}

export function applyTutorialSmsReply(record: SmsMockScenario, body: string): SmsMockScenario {
  if (record.id !== TUTORIAL_SMS_ID) throw new Error("Choose the tutorial SMS to continue.");
  const next = applySmsPrototypeAction(record, { type: "simulate_response", body });
  return { ...next, localSimulated: false, conversation: next.conversation.map((item, index) => index === next.conversation.length - 1 ? { ...item, occurredAt: new Date().toISOString() } : item) };
}

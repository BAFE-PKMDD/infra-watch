import type { SmsMockScenario, SmsNotBafeCategory } from "@/types/sms-grievance.types";

// Every simulated outbound message carries this prefix so nobody mistakes a prototype
// reply for something actually delivered to the sender's phone.
export const SAMPLE_SMS_PREFIX = "SAMPLE SMS ONLY. No message was sent.";

// Sent the moment a message is received, before any staff triage — so it always asks for
// the full list rather than trying to parse which fields the sender already gave in
// free-form text. Plain content, with no SAMPLE_SMS_PREFIX baked in: a staff-simulated
// test message (simulate-incoming.ts) sends this for real over the SMS gateway, so the
// text itself must be exactly what a sender would see, in Filipino per the real template.
// Callers that stay simulated-only (the static demo fixture in mock-fixtures.ts) prepend
// SAMPLE_SMS_PREFIX themselves.
export function buildAcknowledgmentReply(ticketId: string): string {
  return [
    `Magandang araw! Maraming salamat sa inyong ulat. Itinala namin ito sa ilalim ng Ticket Blg. ${ticketId}. Susuriin ito ng aming pangkat at tutugon sa lalong madaling panahon.`,
    "Upang matulungan kaming maresolba ito agad, mangyaring ibigay ang sumusunod na mga impormasyon:",
    "1. Uri ng Proyekto",
    "2. Pangalan ng Nagpadala (opsyonal)",
    "3. Edad",
    "4. Kasarian",
    "5. Lokasyon",
    "6. Concern",
    "Kung naibigay mo na ang impormasyong ito sa iyong ulat sa itaas, maaari mo na itong balewalain.",
    "Maraming salamat.",
  ].join("\n");
}

// The two categories need different phrasing: a stray message unrelated to any project
// gets a plain "not for us" reply, while a real project complaint for another agency
// points the sender elsewhere instead of implying their report itself was invalid.
export function buildNotBafeProjectReply(reason: string, category: SmsNotBafeCategory): string {
  const situationLine = category === "different_agency_project"
    ? "the project you're reporting belongs to a different government agency, not BAFE"
    : "this message isn't related to a BAFE project or program";
  const closingLine = category === "different_agency_project"
    ? "Please reach out to the agency responsible for that project directly."
    : "";
  return [`${SAMPLE_SMS_PREFIX} Good day. After review, we found that ${situationLine}, so we're unable to act on it here.`, `Reason: ${reason}.`, closingLine, "Thank you."]
    .filter(Boolean)
    .join(" ");
}

export function buildBafeCaseOpenedReply(caseId: string): string {
  return `${SAMPLE_SMS_PREFIX} Good day. Your report has been confirmed as a BAFE project concern and logged as case ${caseId}. Our review team will continue following up with you on this thread until it's resolved. Thank you.`;
}

// Deterministic so re-rendering the same static fixture set never mints a different ID for
// the same record — derives it from the record's own external message ID instead of a
// counter or timestamp.
export function mintSmsGrievanceCaseId(record: Pick<SmsMockScenario, "externalMessageId">): string {
  const digitGroups = record.externalMessageId.match(/\d+/g);
  const lastDigits = digitGroups?.at(-1);
  const suffix = lastDigits ? lastDigits.slice(-4).padStart(4, "0") : "0000";
  return `SMS-GRIEVANCE-${suffix}`;
}

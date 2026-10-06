import type { SmsMockScenario } from "@/types/sms-grievance.types";

// What is waiting on staff, worked out from the record itself, so it can't be missed by
// someone who wasn't on the page when the text arrived. Whether *this* staff member has
// already opened it is tracked separately in the browser (seen-store.ts); the indicator
// shows only while the record is waiting AND its latest text hasn't been opened.
//   new       — a text nobody has checked yet
//   new_reply — an open case where the sender spoke last (a follow-up that was linked in,
//               or an answer to a question the team asked); staff replying or leaving an
//               internal note stops it being "waiting" for everyone
export type SmsAttention = "new" | "new_reply";

export const SMS_ATTENTION_LABELS: Record<SmsAttention, string> = {
  new: "New",
  new_reply: "New reply",
};

export function smsAttention(record: SmsMockScenario): SmsAttention | null {
  // A copy folded into another case, a message dismissed as not ours, and a closed case
  // aren't waiting on anyone.
  if (record.relevance === "duplicate" || record.relevance === "out_of_scope" || record.status === "closed") return null;
  if (record.status === "needs_relevance_review") return "new";

  const lastSpoken = [...record.conversation].reverse().find((item) => (
    item.kind === "inbound_sms" || item.kind === "outbound_sms" || item.kind === "internal_note"
  ));
  return lastSpoken?.kind === "inbound_sms" ? "new_reply" : null;
}

export function countSmsAttention(records: SmsMockScenario[]) {
  return records.filter((record) => smsAttention(record) !== null).length;
}

// When the sender last wrote. A newer text on a case this person already opened makes it
// unseen again.
export function smsAttentionStamp(record: SmsMockScenario): string {
  const lastInbound = [...record.conversation].reverse().find((item) => item.kind === "inbound_sms");
  return lastInbound?.occurredAt ?? record.receivedAt;
}

// message id -> the sender-text time that was on screen when it was opened.
export type SmsSeenMap = Record<string, string>;

export function isSmsUnseen(record: SmsMockScenario, seen: SmsSeenMap): boolean {
  if (smsAttention(record) === null) return false;
  const seenAt = seen[record.id];
  if (!seenAt) return true;
  return new Date(smsAttentionStamp(record)).getTime() > new Date(seenAt).getTime();
}

export function countUnseenSmsAttention(records: SmsMockScenario[], seen: SmsSeenMap) {
  return records.filter((record) => isSmsUnseen(record, seen)).length;
}

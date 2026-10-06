import assert from "node:assert/strict";
import { test } from "bun:test";

import { countSmsAttention, countUnseenSmsAttention, isSmsUnseen, smsAttention, smsAttentionStamp } from "./attention";
import { mapRawGrievanceToRecord } from "./live-source";
import type { SmsConversationItem, SmsMockScenario } from "@/types/sms-grievance.types";

const base = mapRawGrievanceToRecord({
  id: 1,
  sms_id: "+639170000001",
  sms_number: "+639170000001",
  sms_content: "hello",
  sms_receive_date: "10/05/2026",
  sms_receive_time: "09:00:00 AM",
  location: "",
  status: 1,
  month: "October",
  year: 2026,
});

const item = (id: string, kind: SmsConversationItem["kind"]): SmsConversationItem => ({ id, kind, body: id, occurredAt: "2026-10-05T01:00:00.000Z" });
const openCase = (conversation: SmsConversationItem[]): SmsMockScenario => ({ ...base, status: "under_review", relevance: "confirmed_in_scope", conversation });

test("a text nobody has checked yet is new", () => {
  assert.equal(smsAttention(base), "new");
});

test("an open case where the sender spoke last has a new reply, and staff replying clears it", () => {
  assert.equal(smsAttention(openCase([item("a", "inbound_sms"), item("b", "outbound_sms"), item("c", "inbound_sms")])), "new_reply");
  assert.equal(smsAttention(openCase([item("a", "inbound_sms"), item("c", "inbound_sms"), item("d", "outbound_sms")])), null);
});

test("an internal note counts as staff having dealt with it, but a status change alone does not", () => {
  assert.equal(smsAttention(openCase([item("a", "inbound_sms"), item("n", "internal_note")])), null);
  assert.equal(smsAttention(openCase([item("a", "outbound_sms"), item("c", "inbound_sms"), item("s", "status_event")])), "new_reply");
});

test("closed cases, folded copies and dismissed messages never ask for attention", () => {
  assert.equal(smsAttention({ ...openCase([item("a", "inbound_sms")]), status: "closed" }), null);
  assert.equal(smsAttention({ ...base, relevance: "duplicate" }), null);
  assert.equal(smsAttention({ ...base, relevance: "out_of_scope" }), null);
});

test("countSmsAttention counts only the records that need attention", () => {
  const waiting = openCase([item("a", "inbound_sms")]);
  const done = openCase([item("a", "inbound_sms"), item("b", "outbound_sms")]);
  assert.equal(countSmsAttention([base, waiting, done, { ...base, relevance: "duplicate" }]), 2);
});

test("the indicator shows until this browser has opened the message, and returns when the sender writes again", () => {
  const waiting: SmsMockScenario = { ...openCase([{ ...item("a", "inbound_sms"), occurredAt: "2026-10-05T01:00:00.000Z" }]) };
  const stamp = smsAttentionStamp(waiting);
  assert.equal(stamp, "2026-10-05T01:00:00.000Z");

  assert.equal(isSmsUnseen(waiting, {}), true);
  assert.equal(isSmsUnseen(waiting, { [waiting.id]: stamp }), false);

  const followedUp: SmsMockScenario = { ...waiting, conversation: [...waiting.conversation, { ...item("b", "inbound_sms"), occurredAt: "2026-10-05T03:00:00.000Z" }] };
  assert.equal(isSmsUnseen(followedUp, { [waiting.id]: stamp }), true);
});

test("a record that isn't waiting on anyone is never unseen, and counting skips what was opened", () => {
  const answered = openCase([item("a", "inbound_sms"), item("b", "outbound_sms")]);
  assert.equal(isSmsUnseen(answered, {}), false);
  assert.equal(countUnseenSmsAttention([base, answered], {}), 1);
  assert.equal(countUnseenSmsAttention([base, answered], { [base.id]: smsAttentionStamp(base) }), 0);
});

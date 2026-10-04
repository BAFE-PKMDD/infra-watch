import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  appendFollowUpMessage,
  createSimulatedIncomingMessage,
  findLatestThreadForContact,
  LOCAL_SIMULATED_ID_PREFIX,
} from "./simulate-incoming";
import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import { mapRawGrievanceToRecord } from "./live-source";

test("createSimulatedIncomingMessage builds an untriaged record with a plain-text Filipino acknowledgment, ready to actually send", () => {
  const record = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "Test message lang po ito" }, []);

  assert.equal(record.contactNumber, "09171234567");
  assert.equal(record.originalText, "Test message lang po ito");
  assert.equal(record.status, "needs_relevance_review");
  assert.equal(record.relevance, "uncertain");
  assert.equal(record.localSimulated, true);
  assert.ok(record.id.startsWith(LOCAL_SIMULATED_ID_PREFIX));
  assert.equal(record.deliveryStatus, "simulated_pending");
  assert.equal(record.conversation.length, 2);
  assert.equal(record.conversation[0].kind, "inbound_sms");
  assert.equal(record.conversation[1].kind, "outbound_sms");
  // Plain content, no "SAMPLE SMS ONLY" prefix — this body is meant to actually be sent
  // over the real gateway once the caller awaits that send (see simulate-incoming.ts).
  assert.doesNotMatch(record.conversation[1].body, /SAMPLE SMS ONLY/);
  assert.match(record.conversation[1].body, /Magandang araw!/);
  assert.match(record.conversation[1].body, new RegExp(record.externalMessageId));
});

test("createSimulatedIncomingMessage requires a phone number and message text", () => {
  assert.throws(() => createSimulatedIncomingMessage({ contactNumber: "", originalText: "hello" }, []), /Phone number/);
  assert.throws(() => createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "" }, []), /Message text/);
});

test("createSimulatedIncomingMessage mints a distinct id and external message id per call", () => {
  const first = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "First" }, []);
  const second = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "Second" }, [first]);

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.externalMessageId, second.externalMessageId);
});

test("createSimulatedIncomingMessage falls back to a not-provided location label", () => {
  const record = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "hello" }, []);
  assert.equal(record.locationLabel, "Location not provided");
});

test("findLatestThreadForContact never matches on the shared masked placeholder every sample fixture uses", () => {
  assert.equal(findLatestThreadForContact(SMS_MOCK_SCENARIOS, "09*******89"), null);
});

test("findLatestThreadForContact never matches on a missing-sender placeholder", () => {
  const noSender = mapRawGrievanceToRecord({ id: 1, sms_id: "null", sms_number: "null", sms_content: "test", sms_receive_date: "01/01/2026", sms_receive_time: "08:00:00 AM", location: "", status: 1, month: "January", year: 2026 });
  assert.equal(noSender.contactNumber, "Not provided");
  assert.equal(findLatestThreadForContact([noSender], "Not provided"), null);
});

test("findLatestThreadForContact matches a staff-simulated record by a real contact number", () => {
  const simulated = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "hello" }, []);
  assert.equal(findLatestThreadForContact([...SMS_MOCK_SCENARIOS, simulated], "09171234567")?.id, simulated.id);
});

test("findLatestThreadForContact also matches a real live-feed record by its real contact number", () => {
  const live = mapRawGrievanceToRecord({ id: 1, sms_id: "+639171234567", sms_number: "+639171234567", sms_content: "testing", sms_receive_date: "01/01/2026", sms_receive_time: "08:00:00 AM", location: "", status: 1, month: "January", year: 2026 });
  assert.equal(findLatestThreadForContact([live], "+639171234567")?.id, live.id);
});

test("findLatestThreadForContact excludes the record being reviewed itself", () => {
  const only = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "hello" }, []);
  assert.equal(findLatestThreadForContact([only], "09171234567", only.id), null);
});

test("findLatestThreadForContact picks the most recently received match when there's more than one", () => {
  const older = { ...createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "first" }, []), receivedAt: "2026-01-01T00:00:00.000Z" };
  const newer = { ...createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "second" }, [older]), receivedAt: "2026-01-02T00:00:00.000Z" };
  const unrelatedNumber = createSimulatedIncomingMessage({ contactNumber: "09989998888", originalText: "unrelated" }, []);

  const found = findLatestThreadForContact([older, newer, unrelatedNumber], "09171234567");
  assert.equal(found?.id, newer.id);
});

test("appendFollowUpMessage adds a short real-reply item to the thread without repeating the full field request", () => {
  const thread = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "first message" }, []);
  const updated = appendFollowUpMessage(thread, "sumunod na mensahe ko");

  assert.equal(updated.id, thread.id);
  assert.equal(updated.conversation.length, thread.conversation.length + 2);
  const newInbound = updated.conversation.at(-2);
  const newOutbound = updated.conversation.at(-1);
  assert.equal(newInbound?.kind, "inbound_sms");
  assert.equal(newInbound?.body, "sumunod na mensahe ko");
  assert.equal(newOutbound?.kind, "outbound_sms");
  assert.doesNotMatch(newOutbound?.body ?? "", /Uri ng Proyekto/);
  assert.match(newOutbound?.body ?? "", new RegExp(thread.externalMessageId));
});

test("appendFollowUpMessage reopens a resolved or closed thread to under_review with a status event", () => {
  const thread = { ...createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "first message" }, []), status: "closed" as const };
  const updated = appendFollowUpMessage(thread, "follow up after closing");

  assert.equal(updated.status, "under_review");
  assert.equal(updated.conversation.at(-1)?.kind, "status_event");
  assert.match(updated.conversation.at(-1)?.body ?? "", /Reopened/);
});

test("appendFollowUpMessage leaves an in-progress thread's status untouched", () => {
  const thread = { ...createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "first message" }, []), status: "under_review" as const };
  const updated = appendFollowUpMessage(thread, "another update");

  assert.equal(updated.status, "under_review");
  assert.equal(updated.conversation.at(-1)?.kind, "outbound_sms");
});

test("appendFollowUpMessage requires non-empty message text", () => {
  const thread = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "first message" }, []);
  assert.throws(() => appendFollowUpMessage(thread, ""), /Message text/);
});

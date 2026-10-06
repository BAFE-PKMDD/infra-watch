import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  LiveReviewConflictError,
  isReplyableContact,
  readAutoAcknowledgeOptions,
  runLiveSmsAction,
  runLiveSmsLink,
  runSmsAutoAcknowledgments,
  runSmsAutoLinks,
  type LiveReviewDeps,
} from "./live-review";
import { mapRawGrievanceToRecord, type RawSmsGrievanceMessage } from "./live-source";
import { createMemorySmsReviewStore } from "./review-store";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

function rawMessage(id: number, overrides: Partial<RawSmsGrievanceMessage> = {}): RawSmsGrievanceMessage {
  return {
    id,
    sms_id: "+639170000001",
    sms_number: "+639170000001",
    sms_content: `message ${id}`,
    sms_receive_date: "10/05/2026",
    sms_receive_time: "09:00:00 AM",
    location: "6.99607,125.0715867",
    status: 1,
    month: "October",
    year: 2026,
    ...overrides,
  };
}

function setup(records: SmsMockScenario[], sendResult: { success: boolean; error?: string } = { success: true }) {
  const store = createMemorySmsReviewStore();
  const sent: Array<{ mobile: string; message: string }> = [];
  const deps: LiveReviewDeps = {
    store,
    send: async (mobile, message) => {
      sent.push({ mobile, message });
      return sendResult;
    },
    loadLive: async (id) => records.find((record) => record.id === id) ?? null,
    now: () => "2026-10-05T01:00:00.000Z",
  };
  return { store, sent, deps };
}

const notBafe = { type: "mark_not_bafe_project" as const, reason: "Not about a BAFE project.", category: "not_related_to_infrawatch" as const };
const reply = { type: "simulate_response" as const, body: "Salamat po, sinusuri na namin ito." };

test("isReplyableContact accepts PH mobile formats and rejects everything else", () => {
  for (const ok of ["09171234567", "+639171234567", "639171234567", "0917 123 4567", "+63 917-123-4567"]) assert.ok(isReplyableContact(ok), ok);
  for (const bad of ["Not provided", "8080", "GLOBE", "09*******89", "+14155550123", ""]) assert.ok(!isReplyableContact(bad), bad);
});

test("a reply is saved, sends one real SMS with exactly the staff text, and is recorded as sent", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(7));
  const { deps, store, sent } = setup([live]);

  const result = await runLiveSmsAction(deps, live.id, reply, "staff-1");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].mobile, "+639170000001");
  assert.equal(sent[0].message, reply.body);
  assert.equal(result.delivery?.success, true);

  const saved = store.rows.get(live.id)!;
  assert.equal(saved.record.deliveryStatus, "sent");
  const outbound = saved.record.conversation.filter((item) => item.kind === "outbound_sms");
  assert.equal(outbound.length, 1);
  assert.equal(outbound[0].deliveryStatus, "sent");
  assert.equal(outbound[0].occurredAt, "2026-10-05T01:00:00.000Z");
});

test("asking for details texts the sender, flags the question, and leaves the message in needs-checking", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(11));
  const { deps, store, sent } = setup([live]);
  const body = "Pakibigay po ang pangalan ng proyekto.";

  const result = await runLiveSmsAction(deps, live.id, { type: "request_details", body }, "staff-1");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].message, body);
  assert.equal(result.delivery?.success, true);
  const saved = store.rows.get(live.id)!.record;
  assert.equal(saved.status, "needs_relevance_review");
  const asked = saved.conversation.filter((item) => item.purpose === "details_request");
  assert.equal(asked.length, 1);
  assert.equal(asked[0].deliveryStatus, "sent");
});

test("asking for details is refused once the message has already been decided", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(12));
  const { deps, sent } = setup([live]);
  await runLiveSmsAction(deps, live.id, notBafe, "staff-1");

  await assert.rejects(() => runLiveSmsAction(deps, live.id, { type: "request_details", body: "Hello" }, "staff-1"), /only while the message needs checking/);
  assert.equal(sent.length, 0);
});

test("marking a message not-BAFE files it away without texting the sender", async () => {
  for (const [id, category] of [[5, "not_related_to_infrawatch"], [6, "different_agency_project"]] as const) {
    const live = mapRawGrievanceToRecord(rawMessage(id));
    const { deps, store, sent } = setup([live]);

    const result = await runLiveSmsAction(deps, live.id, { ...notBafe, category }, "staff-1");

    assert.equal(sent.length, 0);
    assert.equal(result.delivery, undefined);
    const saved = store.rows.get(live.id)!.record;
    assert.equal(saved.status, "closed");
    assert.equal(saved.relevance, "out_of_scope");
    assert.equal(saved.conversation.filter((item) => item.kind === "outbound_sms").length, 0);
  }
});

test("a failed gateway send keeps the staff decision and marks the reply failed", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(8));
  const { deps, store } = setup([live], { success: false, error: "Gateway rejected the message" });

  const result = await runLiveSmsAction(deps, live.id, reply, "staff-1");

  assert.equal(result.delivery?.success, false);
  assert.equal(result.delivery?.error, "Gateway rejected the message");
  const saved = store.rows.get(live.id)!.record;
  assert.equal(saved.deliveryStatus, "send_failed");
});

test("a sender with no mobile number is reviewed normally but nothing is sent", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(9, { sms_number: "null", sms_id: "null" }));
  const { deps, sent } = setup([live]);

  const result = await runLiveSmsAction(deps, live.id, reply, "staff-1");

  assert.equal(sent.length, 0);
  assert.equal(result.delivery?.success, false);
  assert.match(result.delivery?.error ?? "", /no mobile number/);
});

test("an action with no reply to the sender (internal note) sends nothing", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(10));
  const { deps, sent } = setup([live]);
  // Notes are only valid on a reviewed case in the UI, but the reducer itself accepts them.
  const result = await runLiveSmsAction(deps, live.id, { type: "add_internal_note", body: "check with region" }, "staff-1");

  assert.equal(sent.length, 0);
  assert.equal(result.delivery, undefined);
});

test("two reviewers racing on the same message can't both send a reply", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(11));
  const { deps, sent } = setup([live]);

  const outcomes = await Promise.allSettled([
    runLiveSmsAction(deps, live.id, reply, "staff-1"),
    runLiveSmsAction(deps, live.id, reply, "staff-2"),
  ]);

  assert.equal(sent.length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof LiveReviewConflictError);
});

test("re-submitting a decision that was already made is refused", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(12));
  const { deps, sent } = setup([live]);

  await runLiveSmsAction(deps, live.id, notBafe, "staff-1");
  await assert.rejects(runLiveSmsAction(deps, live.id, notBafe, "staff-1"), /only while the sample needs checking/);
  assert.equal(sent.length, 0);
});

test("an unknown message id is rejected", async () => {
  const { deps } = setup([]);
  await assert.rejects(runLiveSmsAction(deps, "live-sms-404", notBafe, "staff-1"), /no longer on the SMS grievance line/);
});

test("linking folds the new message into the sender's case without texting the sender", async () => {
  const first = mapRawGrievanceToRecord(rawMessage(20, { sms_content: "first report" }));
  const second = mapRawGrievanceToRecord(rawMessage(21, { sms_content: "more details" }));
  const { deps, store, sent } = setup([first, second]);

  const result = await runLiveSmsLink(deps, second.id, first.id, "staff-1");

  assert.equal(sent.length, 0);
  assert.equal(result.delivery, undefined);

  const thread = store.rows.get(first.id)!.record;
  assert.equal(thread.conversation.filter((item) => item.kind === "inbound_sms").length, 2);
  assert.equal(thread.conversation.some((item) => item.kind === "outbound_sms"), false);
  const closed = store.rows.get(second.id)!.record;
  assert.equal(closed.relevance, "duplicate");
  assert.equal(closed.status, "closed");
});

test("linking refuses messages from different senders", async () => {
  const first = mapRawGrievanceToRecord(rawMessage(30));
  const other = mapRawGrievanceToRecord(rawMessage(31, { sms_number: "+639170000002", sms_id: "+639170000002" }));
  const { deps, sent } = setup([first, other]);

  await assert.rejects(runLiveSmsLink(deps, other.id, first.id, "staff-1"), /same sender/);
  assert.equal(sent.length, 0);
});

test("readAutoAcknowledgeOptions needs an explicit flag and a valid cutoff", () => {
  assert.deepEqual(readAutoAcknowledgeOptions({}), { enabled: false, since: null });
  assert.equal(readAutoAcknowledgeOptions({ SMS_AUTO_ACK_ENABLED: "true", SMS_AUTO_ACK_SINCE: "nope" }).since, null);
  const ok = readAutoAcknowledgeOptions({ SMS_AUTO_ACK_ENABLED: "true", SMS_AUTO_ACK_SINCE: "2026-10-05T00:00:00+08:00" });
  assert.equal(ok.enabled, true);
  assert.equal(ok.since?.toISOString(), "2026-10-04T16:00:00.000Z");
});

function autoAckSetup(records: SmsMockScenario[]) {
  const { deps, store, sent } = setup(records);
  return { store, sent, deps: { store, send: deps.send, now: deps.now, listLive: async () => records } };
}

test("auto-acknowledgment does nothing unless enabled and given a cutoff", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(40));
  const { deps, sent } = autoAckSetup([live]);

  assert.equal((await runSmsAutoAcknowledgments(deps, { enabled: false, since: new Date(0) })).skippedReason, "disabled");
  assert.match((await runSmsAutoAcknowledgments(deps, { enabled: true, since: null })).skippedReason ?? "", /SMS_AUTO_ACK_SINCE/);
  assert.equal(sent.length, 0);
});

test("auto-acknowledgment replies once to new messages and never to ones before the cutoff", async () => {
  const old = mapRawGrievanceToRecord(rawMessage(50, { sms_receive_date: "01/01/2026" }));
  const fresh = mapRawGrievanceToRecord(rawMessage(51, { sms_number: "+639170000009", sms_id: "+639170000009" }));
  const { deps, sent, store } = autoAckSetup([old, fresh]);
  const options = { enabled: true, since: new Date("2026-10-01T00:00:00Z") };

  const first = await runSmsAutoAcknowledgments(deps, options);
  const second = await runSmsAutoAcknowledgments(deps, options);

  assert.deepEqual(first, { acknowledged: 1, failed: 0 });
  assert.deepEqual(second, { acknowledged: 0, failed: 0 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].mobile, "+639170000009");
  assert.match(sent[0].message, /Ticket Blg\. BAFE-SMS-51/);
  assert.ok(!store.rows.has(old.id));
  assert.equal(store.rows.get(fresh.id)!.record.conversation.at(-1)?.deliveryStatus, "sent");
  assert.equal(store.rows.get(fresh.id)!.record.status, "needs_relevance_review");
});

test("auto-acknowledgment skips senders it can't text, skips messages staff already handled, and honors the per-run cap", async () => {
  const noNumber = mapRawGrievanceToRecord(rawMessage(60, { sms_number: "null", sms_id: "null" }));
  const handled = mapRawGrievanceToRecord(rawMessage(61));
  const batch = [70, 71, 72].map((id) => mapRawGrievanceToRecord(rawMessage(id)));
  const { deps, sent, store } = autoAckSetup([noNumber, handled, ...batch]);
  await store.create(handled, "staff-1");

  const result = await runSmsAutoAcknowledgments(deps, { enabled: true, since: new Date("2026-10-01T00:00:00Z"), maxPerRun: 2 });

  assert.deepEqual(result, { acknowledged: 2, failed: 0 });
  assert.equal(sent.length, 2);
  assert.ok(!store.rows.has(noNumber.id));
});

test("a failed auto-acknowledgment is recorded as failed and not retried", async () => {
  const live = mapRawGrievanceToRecord(rawMessage(80));
  const { store } = autoAckSetup([live]);
  const failingDeps = {
    store,
    send: async () => ({ success: false, error: "down" }),
    listLive: async () => [live],
    now: () => "2026-10-05T01:00:00.000Z",
  };
  const options = { enabled: true, since: new Date("2026-10-01T00:00:00Z") };

  assert.deepEqual(await runSmsAutoAcknowledgments(failingDeps, options), { acknowledged: 0, failed: 1 });
  assert.deepEqual(await runSmsAutoAcknowledgments(failingDeps, options), { acknowledged: 0, failed: 0 });
  assert.equal(store.rows.get(live.id)!.record.conversation.at(-1)?.deliveryStatus, "send_failed");
});

function autoLinkSetup(records: SmsMockScenario[]) {
  const { deps, store, sent } = setup(records);
  return { store, sent, run: () => runSmsAutoLinks({ ...deps, listLive: async () => records }) };
}

test("auto-link folds a same-sender message from the same week into the earlier case without texting", async () => {
  const first = mapRawGrievanceToRecord(rawMessage(40, { sms_content: "hello", sms_receive_time: "09:00:00 AM" }));
  const second = mapRawGrievanceToRecord(rawMessage(41, { sms_content: "testt", sms_receive_time: "10:00:00 AM" }));
  const { run, store, sent } = autoLinkSetup([first, second]);

  const result = await run();

  assert.deepEqual(result, { linked: 1, failed: 0 });
  assert.equal(sent.length, 0);
  const thread = store.rows.get(first.id)!.record;
  assert.deepEqual(thread.conversation.filter((item) => item.kind === "inbound_sms").map((item) => item.body).slice(-1), ["testt"]);
  assert.equal(thread.conversation.some((item) => item.kind === "outbound_sms"), false);
  assert.equal(store.rows.get(second.id)!.record.status, "closed");
  assert.equal(store.rows.get(second.id)!.record.relevance, "duplicate");

  assert.deepEqual(await run(), { linked: 0, failed: 0 });
});

test("auto-link leaves messages alone when they are more than a week apart, from different senders, or the earlier case was dismissed", async () => {
  const oldOne = mapRawGrievanceToRecord(rawMessage(44, { sms_receive_date: "09/20/2026" }));
  const recent = mapRawGrievanceToRecord(rawMessage(45));
  const stranger = mapRawGrievanceToRecord(rawMessage(46, { sms_number: "+639170000002", sms_id: "+639170000002" }));
  const { run, store } = autoLinkSetup([oldOne, recent, stranger]);
  assert.deepEqual(await run(), { linked: 0, failed: 0 });
  assert.equal(store.rows.size, 0);

  const dismissed = mapRawGrievanceToRecord(rawMessage(47, { sms_receive_time: "08:00:00 AM" }));
  const later = mapRawGrievanceToRecord(rawMessage(48, { sms_receive_time: "09:00:00 AM" }));
  const second = autoLinkSetup([dismissed, later]);
  await runLiveSmsAction({ ...setup([dismissed]).deps, store: second.store }, dismissed.id, notBafe, "staff-1");
  assert.deepEqual(await second.run(), { linked: 0, failed: 0 });
});

test("a new text after the sender's earlier case was closed or resolved stays its own ticket", async () => {
  for (const status of ["closed", "resolved"] as const) {
    const earlier = mapRawGrievanceToRecord(rawMessage(50, { sms_receive_time: "09:00:00 AM" }));
    const later = mapRawGrievanceToRecord(rawMessage(51, { sms_receive_time: "10:00:00 AM" }));
    const { run, store } = autoLinkSetup([earlier, later]);
    await store.create({ ...earlier, status, relevance: "confirmed_in_scope" }, "staff-1");

    assert.deepEqual(await run(), { linked: 0, failed: 0 });
    assert.equal(store.rows.has(later.id), false, status);
  }
});

test("a still-open case is preferred over a closed one for the same sender", async () => {
  const closedOne = mapRawGrievanceToRecord(rawMessage(52, { sms_receive_time: "08:00:00 AM" }));
  const openOne = mapRawGrievanceToRecord(rawMessage(53, { sms_receive_time: "09:00:00 AM" }));
  const later = mapRawGrievanceToRecord(rawMessage(54, { sms_receive_time: "10:00:00 AM" }));
  const { run, store } = autoLinkSetup([closedOne, openOne, later]);
  await store.create({ ...closedOne, status: "closed", relevance: "confirmed_in_scope" }, "staff-1");
  await store.create({ ...openOne, status: "under_review", relevance: "confirmed_in_scope" }, "staff-1");

  assert.deepEqual(await run(), { linked: 1, failed: 0 });
  assert.equal(store.rows.get(later.id)!.record.duplicateOf, openOne.id);
});

test("linking by hand reopens a closed case and records why", async () => {
  const earlier = mapRawGrievanceToRecord(rawMessage(55, { sms_receive_time: "09:00:00 AM" }));
  const later = mapRawGrievanceToRecord(rawMessage(56, { sms_content: "may bago po", sms_receive_time: "10:00:00 AM" }));
  const { deps, store, sent } = setup([earlier, later]);
  await store.create({ ...earlier, status: "closed", relevance: "confirmed_in_scope" }, "staff-1");

  await runLiveSmsLink(deps, later.id, earlier.id, "staff-1");

  const thread = store.rows.get(earlier.id)!.record;
  assert.equal(thread.status, "under_review");
  assert.match(thread.conversation.at(-1)?.body ?? "", /Reopened/);
  assert.ok(thread.conversation.some((item) => item.body === "may bago po"));
  assert.equal(sent.length, 0);
});

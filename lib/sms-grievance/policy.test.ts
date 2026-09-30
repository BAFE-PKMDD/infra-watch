import assert from "node:assert/strict";
import { test } from "bun:test";

import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import {
  canTransitionSmsCase,
  canUseSmsPrototype,
  getSmsActionRequirement,
  isOutboundConversationItem,
  nextSmsCaseStatuses,
} from "./policy";

test("SMS case transitions follow the approved adjacent workflow", () => {
  assert.equal(canTransitionSmsCase("imported", "needs_relevance_review"), true);
  assert.equal(canTransitionSmsCase("needs_relevance_review", "pending_review"), true);
  assert.equal(canTransitionSmsCase("pending_review", "under_review"), true);
  assert.equal(canTransitionSmsCase("under_review", "resolved"), true);
  assert.equal(canTransitionSmsCase("resolved", "closed"), true);
  assert.equal(canTransitionSmsCase("closed", "under_review"), true);

  assert.equal(canTransitionSmsCase("needs_relevance_review", "resolved"), false);
  assert.equal(canTransitionSmsCase("pending_review", "closed"), false);
  assert.equal(canTransitionSmsCase("closed", "pending_review"), false);
});

test("nextSmsCaseStatuses backs the grievance status dropdown with the same adjacent-only rule", () => {
  assert.deepEqual(nextSmsCaseStatuses("pending_review"), ["under_review"]);
  assert.deepEqual(nextSmsCaseStatuses("under_review"), ["resolved"]);
  assert.deepEqual(nextSmsCaseStatuses("resolved"), ["closed", "under_review"]);
  assert.deepEqual(nextSmsCaseStatuses("closed"), ["under_review"]);
});

test("sensitive SMS actions require the approved evidence", () => {
  assert.deepEqual(getSmsActionRequirement("accept"), ["sourceBackedBafeProject", "category", "location", "responsibleOffice", "region", "relevanceReason", "staffConfirmation"]);
  assert.deepEqual(getSmsActionRequirement("mark_not_bafe_project"), ["reason", "staffConfirmation"]);
  assert.deepEqual(getSmsActionRequirement("mark_unrelated"), ["reason"]);
  assert.deepEqual(getSmsActionRequirement("resolve"), ["outcomeSummary", "responsibleOffice"]);
  assert.deepEqual(getSmsActionRequirement("close"), ["closureReason", "supervisorAuthorization"]);
  assert.deepEqual(getSmsActionRequirement("reveal_contact"), ["operationalReason", "contactRevealAuthorization"]);
});

test("internal notes can never be treated as outbound SMS", () => {
  assert.equal(isOutboundConversationItem({ kind: "internal_note" }), false);
  assert.equal(isOutboundConversationItem({ kind: "outbound_sms" }), true);
  assert.equal(isOutboundConversationItem({ kind: "inbound_sms" }), false);
});

test("prototype mode fails closed in production and requires issue-management access", () => {
  assert.equal(canUseSmsPrototype({ nodeEnv: "production", canManageIssues: true }), false);
  assert.equal(canUseSmsPrototype({ nodeEnv: "development", canManageIssues: false }), false);
  assert.equal(canUseSmsPrototype({ nodeEnv: "development", canManageIssues: true }), true);
});

// Truthfulness no longer rests on bracketing every field with a literal "[SAMPLE" tag —
// message text now reads naturally so staff can evaluate the real UX. It instead rests on
// two machine-checkable, always-present markers (prototype flag + masked contact), backed
// by the persistent "SMS Grievance prototype" banner every page that renders these
// records shows (see SmsPrototypeBanner, rendered on both the list and detail pages).
test("the prototype contains exactly twelve deterministic scenarios, each flagged as prototype data with a masked contact", () => {
  assert.equal(SMS_MOCK_SCENARIOS.length, 12);
  assert.equal(new Set(SMS_MOCK_SCENARIOS.map((scenario) => scenario.id)).size, 12);
  assert.ok(SMS_MOCK_SCENARIOS.every((scenario) => scenario.prototype === true));
  assert.ok(SMS_MOCK_SCENARIOS.every((scenario) => scenario.originalText.trim().length > 0));
  assert.ok(SMS_MOCK_SCENARIOS.every((scenario) => scenario.contactNumber === "09*******89"));
});

test("duplicate and follow-up scenarios preserve conversation identity", () => {
  const original = SMS_MOCK_SCENARIOS.find((scenario) => scenario.scenario === "anonymous_valid");
  const duplicate = SMS_MOCK_SCENARIOS.find((scenario) => scenario.scenario === "duplicate_import");
  const followUp = SMS_MOCK_SCENARIOS.find((scenario) => scenario.scenario === "follow_up");

  assert.ok(original);
  assert.ok(duplicate);
  assert.ok(followUp);
  assert.equal(duplicate.duplicateOf, original.id);
  assert.equal(followUp.conversationId, original.conversationId);
  assert.notEqual(followUp.externalMessageId, original.externalMessageId);
});

import assert from "node:assert/strict";
import { test } from "bun:test";

import { getSmsMockScenario } from "./mock-fixtures";
import { applySmsPrototypeAction } from "./prototype-state";

const SAMPLE_BAFE_PROJECT = {
  id: "[SAMPLE BAFE PROJECT ID]",
  name: "[SAMPLE BAFE PROJECT]",
  code: "[SAMPLE PROJECT CODE]",
  province: "[SAMPLE PROJECT PROVINCE]",
  municipality: "[SAMPLE PROJECT MUNICIPALITY]",
};

test("accepting a grievance stores the selected BAFE project identity", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);

  const accepted = applySmsPrototypeAction(candidate, {
    type: "accept",
    category: "flooding_drainage",
    relevanceReason: "Sample location and infrastructure concern confirmed for prototype review.",
    location: "[SAMPLE TAGGED LOCATION]",
    unit: "[SAMPLE REVIEW TEAM]",
    region: "[SAMPLE REGION]",
    project: SAMPLE_BAFE_PROJECT,
    confirmed: true,
  });

  assert.equal(accepted.relevance, "confirmed_in_scope");
  assert.equal(accepted.status, "pending_review");
  assert.equal(accepted.projectMatch, "confirmed");
  assert.equal(accepted.projectId, SAMPLE_BAFE_PROJECT.id);
  assert.equal(accepted.projectLabel, SAMPLE_BAFE_PROJECT.name);
  assert.equal(accepted.projectCode, SAMPLE_BAFE_PROJECT.code);
  assert.equal(accepted.locationLabel, "[SAMPLE TAGGED LOCATION]");
  assert.equal(accepted.assignedUnit, "[SAMPLE REVIEW TEAM]");
  assert.equal(accepted.assignedRegion, "[SAMPLE REGION]");
  assert.equal(accepted.originalText, candidate.originalText);
});

test("accepting a grievance as a possible (unconfirmed) match keeps it flagged for confirmation", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);

  const accepted = applySmsPrototypeAction(candidate, {
    type: "accept",
    category: "flooding_drainage",
    relevanceReason: "Sample location plausibly matches, pending regional confirmation.",
    location: "[SAMPLE TAGGED LOCATION]",
    unit: "[SAMPLE REVIEW TEAM]",
    region: "[SAMPLE REGION]",
    project: SAMPLE_BAFE_PROJECT,
    confirmed: true,
    certainty: "possible",
  });

  assert.equal(accepted.relevance, "uncertain");
  assert.equal(accepted.status, "pending_review");
  assert.equal(accepted.projectMatch, "candidate");
  assert.equal(accepted.projectId, SAMPLE_BAFE_PROJECT.id);
});

test("a grievance cannot become a case without selecting an actual BAFE project", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);

  assert.throws(() => applySmsPrototypeAction(candidate, {
    type: "accept",
    category: "flooding_drainage",
    relevanceReason: "Sample concern confirmed.",
    location: "[SAMPLE LOCATION]",
    unit: "[SAMPLE REVIEW TEAM]",
    region: "[SAMPLE REGION]",
    project: null,
    confirmed: true,
  }), /BAFE project/i);
});

test("marking a grievance as not a BAFE project closes it without creating a case", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);

  const outsideBafe = applySmsPrototypeAction(candidate, {
    type: "mark_not_bafe_project",
    reason: "The referenced infrastructure is not in the BAFE project registry.",
  });

  assert.equal(outsideBafe.relevance, "out_of_scope");
  assert.equal(outsideBafe.status, "closed");
  assert.equal(outsideBafe.projectMatch, "not_bafe_project");
  assert.equal(outsideBafe.projectLabel, "Not a BAFE project");
  assert.equal(outsideBafe.originalText, candidate.originalText);
});

test("case creation requires an explicit moderator or admin confirmation", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);

  assert.throws(() => applySmsPrototypeAction(candidate, {
    type: "accept",
    category: "flooding_drainage",
    relevanceReason: "Sample concern confirmed.",
    location: "[SAMPLE LOCATION]",
    unit: "[SAMPLE REVIEW TEAM]",
    region: "[SAMPLE REGION]",
    project: SAMPLE_BAFE_PROJECT,
    confirmed: false,
  }), /moderator or admin confirmation/i);
});

test("marking a candidate unrelated requires a reason", () => {
  const candidate = getSmsMockScenario("sample-sms-005");
  assert.ok(candidate);

  assert.throws(() => applySmsPrototypeAction(candidate, { type: "mark_unrelated", reason: "" }), /reason/i);
  const unrelated = applySmsPrototypeAction(candidate, { type: "mark_unrelated", reason: "Sample non-infrastructure request." });
  assert.equal(unrelated.relevance, "out_of_scope");
  assert.equal(unrelated.originalText, candidate.originalText);
});

test("simulated responses are labelled and do not alter the original SMS", () => {
  const candidate = getSmsMockScenario("sample-sms-001");
  assert.ok(candidate);

  const updated = applySmsPrototypeAction(candidate, { type: "simulate_response", body: "Sample acknowledgment." });
  const response = updated.conversation.at(-1);

  assert.equal(updated.originalText, candidate.originalText);
  assert.equal(response?.kind, "outbound_sms");
  assert.match(response?.body ?? "", /^SAMPLE SMS ONLY\. No message was sent\./);
  assert.equal(response?.deliveryStatus, "simulated_delivered");
});

test("internal notes remain separate from outbound SMS", () => {
  const candidate = getSmsMockScenario("sample-sms-001");
  assert.ok(candidate);

  const updated = applySmsPrototypeAction(candidate, { type: "add_internal_note", body: "Sample internal review note." });
  assert.equal(updated.conversation.at(-1)?.kind, "internal_note");
  assert.doesNotMatch(updated.conversation.at(-1)?.body ?? "", /No message was sent/);
});

test("sensitive restriction requires a reason and explicit prototype authorization", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  if (!candidate) throw new Error("Missing sample fixture");
  assert.throws(() => applySmsPrototypeAction(candidate, { type: "restrict", reason: "Sensitive sample", authorized: false }), /authorization/i);
  const restricted = applySmsPrototypeAction(candidate, { type: "restrict", reason: "Sensitive sample", authorized: true });
  assert.equal(restricted.sensitive, true);
});


test("relevance decisions cannot be repeated after intake leaves the review queue", () => {
  const accepted = getSmsMockScenario("sample-sms-001");
  assert.ok(accepted);
  assert.throws(
    () => applySmsPrototypeAction(accepted, {
      type: "accept",
      category: "damaged_infrastructure",
      relevanceReason: "Sample reason",
      location: "[SAMPLE LOCATION]",
      unit: "[SAMPLE REVIEW TEAM]",
      region: "[SAMPLE REGION]",
      project: SAMPLE_BAFE_PROJECT,
      confirmed: true,
    }),
    /needs checking/i,
  );
});

test("assignment requires staff confirmation and preserves placeholder-only labels", () => {
  const candidate = getSmsMockScenario("sample-sms-001");
  assert.ok(candidate);
  assert.throws(
    () => applySmsPrototypeAction(candidate, { type: "assign", unit: "[SAMPLE REVIEW TEAM]", region: "[SAMPLE REGION]", confirmed: false }),
    /confirm the sample assignment/i,
  );

  const assigned = applySmsPrototypeAction(candidate, {
    type: "assign",
    unit: "[SAMPLE REVIEW TEAM]",
    region: "[SAMPLE REGION]",
    confirmed: true,
  });
  assert.equal(assigned.assignedUnit, "[SAMPLE REVIEW TEAM]");
  assert.equal(assigned.assignedRegion, "[SAMPLE REGION]");
});

test("lifecycle actions enforce adjacent transitions and record reasons", () => {
  const pending = getSmsMockScenario("sample-sms-001");
  assert.ok(pending);
  const reviewing = applySmsPrototypeAction(pending, { type: "transition", to: "under_review", reason: "Sample review started" });
  assert.equal(reviewing.status, "under_review");
  assert.equal(reviewing.conversation.at(-1)?.kind, "status_event");
  assert.match(reviewing.conversation.at(-1)?.body ?? "", /Sample review started/);
  assert.throws(
    () => applySmsPrototypeAction(pending, { type: "transition", to: "closed", reason: "Invalid skip" }),
    /isn't available/,
  );
});

test("duplicate classification requires a reason and sample case reference", () => {
  const candidate = getSmsMockScenario("sample-sms-004");
  assert.ok(candidate);
  assert.throws(
    () => applySmsPrototypeAction(candidate, { type: "mark_duplicate", duplicateOf: "", reason: "Sample duplicate" }),
    /case reference/,
  );
  const duplicate = applySmsPrototypeAction(candidate, {
    type: "mark_duplicate",
    duplicateOf: "[SAMPLE EXISTING CASE]",
    reason: "Same sample concern",
  });
  assert.equal(duplicate.relevance, "duplicate");
  assert.equal(duplicate.duplicateOf, "[SAMPLE EXISTING CASE]");
});

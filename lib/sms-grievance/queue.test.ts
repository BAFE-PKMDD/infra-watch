import assert from "node:assert/strict";
import { test } from "bun:test";

import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";
import { filterSmsReviewRecords, smsStatusLabel } from "@/lib/sms-grievance/queue";

test("queue filters distinguish review, accepted, unrelated, restricted, and urgent records", () => {
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "needs_review").every((item) => item.status === "needs_relevance_review"));
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "accepted").every((item) => item.relevance === "confirmed_in_scope"));
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "unrelated").every((item) => item.relevance === "out_of_scope"));
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "restricted").every((item) => item.sensitive));
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "urgent").every((item) => item.urgentReview));
});

test("a message linked as a duplicate is excluded from every queue filter — its content now lives in the case it's linked to", () => {
  const duplicate = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "duplicate");
  assert.ok(duplicate, "fixture set should include a duplicate sample");
  for (const { value } of [{ value: "all" as const }, { value: "needs_review" as const }, { value: "accepted" as const }, { value: "unrelated" as const }, { value: "restricted" as const }, { value: "urgent" as const }]) {
    assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, value).every((item) => item.id !== duplicate!.id), `duplicate sample should not appear under "${value}"`);
  }
});

test("a message tagged not-a-BAFE-project drops out of the default 'all' view, staying visible under 'Not a BAFE project'", () => {
  const outOfScope = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "out_of_scope");
  assert.ok(outOfScope, "fixture set should include an out-of-scope sample");
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "all").every((item) => item.id !== outOfScope!.id));
  assert.ok(filterSmsReviewRecords(SMS_MOCK_SCENARIOS, "unrelated").some((item) => item.id === outOfScope!.id));
});

test("smsStatusLabel gives a human status distinct from raw case status", () => {
  const notBafe = SMS_MOCK_SCENARIOS.find((item) => item.projectMatch === "not_bafe_project");
  const needsReview = SMS_MOCK_SCENARIOS.find((item) => item.status === "needs_relevance_review" && item.relevance === "uncertain");
  assert.ok(notBafe, "fixture set should include a not-a-BAFE-project sample");
  assert.ok(needsReview, "fixture set should include a needs-checking sample");
  assert.equal(smsStatusLabel(notBafe!), "Not a BAFE project");
  assert.equal(smsStatusLabel(needsReview!), "Needs checking");
});

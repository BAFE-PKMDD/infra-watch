import assert from "node:assert/strict";
import { test } from "bun:test";

import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import { getPrototypeAcceptedIssues, toPrototypeAdminIssue } from "./issue-management";

test("only confirmed in-scope samples appear as accepted Issue Management rows", () => {
  const rows = getPrototypeAcceptedIssues(SMS_MOCK_SCENARIOS);

  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.source === "sms_prototype"));
  assert.ok(rows.every((row) => row.prototype === true));
  assert.ok(rows.every((row) => row.ticketNumber.startsWith("[SAMPLE TRACKING")));
  assert.ok(rows.every((row) => row.reporterName === "*** *** ****"));
});

test("prototype Issue Management mapping does not expose an identified sample name", () => {
  const identified = SMS_MOCK_SCENARIOS.find((item) => item.scenario === "identified_valid");
  assert.ok(identified);

  const row = toPrototypeAdminIssue(identified);
  assert.equal(row.reporterName, "*** *** ****");
  assert.equal(row.sourceLabel, "SMS Grievance, sample only");
  assert.equal(row.issueDescription, identified.originalText);
});

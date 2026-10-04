import assert from "node:assert/strict";
import { test } from "bun:test";
import { reportIssueDetailsError } from "./report-issue-validation";

test("E-Report cannot proceed without an issue type, date, and a 20-character description", () => {
  const valid = { issueType: "Cracks", dateNoticed: "2026-10-03", issueDescription: "The canal lining has visible cracks near the entrance." };
  assert.equal(reportIssueDetailsError({ ...valid, issueType: "", issueDescription: "adsadsadas" }), "selectIssueType");
  assert.equal(reportIssueDetailsError({ ...valid, issueDescription: "adsadsadas" }), "descriptionMin");
  assert.equal(reportIssueDetailsError({ ...valid, issueDescription: ` ${"a".repeat(19)} ` }), "descriptionMin");
  assert.equal(reportIssueDetailsError({ ...valid, dateNoticed: "" }), "dateNoticed");
  assert.equal(reportIssueDetailsError({ ...valid, issueDescription: "a".repeat(20) }), null);
  assert.equal(reportIssueDetailsError(valid), null);
});

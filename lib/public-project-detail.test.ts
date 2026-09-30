import assert from "node:assert/strict";
import { test } from "bun:test";
import { normalizePublicProjectFacts } from "./public-project-detail";

const now = new Date("2026-09-30T00:00:00Z");
const row = {
  status: "Ongoing",
  stage: "Implementation",
  budget: "1000000.00",
  abc: 900000,
  contractorName: "ABC Builders",
  startDate: new Date("2025-01-01T00:00:00Z"),
  actualCompletionDate: new Date("2025-06-30T00:00:00Z"),
  targetCompletionDate: new Date("2025-07-31T00:00:00Z"),
  dateTurnOver: "2025-08-01",
};

test("excludes proposal and pre-implementation details regardless of budget year", () => {
  assert.equal(normalizePublicProjectFacts({ ...row, status: "Proposal", stage: "Proposal" }, now), null);
  assert.equal(normalizePublicProjectFacts({ ...row, status: "For Review", stage: "Pre-implementation" }, now), null);
});

test("retains public lifecycle distinctions and the stage fallback", () => {
  assert.equal(normalizePublicProjectFacts({ ...row, status: "Suspended" }, now)?.publicStage, "on_hold");
  assert.equal(normalizePublicProjectFacts({ ...row, status: "For Turn-Over" }, now)?.publicStage, "turnover");
  assert.equal(normalizePublicProjectFacts({ ...row, status: "Completed" }, now)?.publicStage, "handed_over");
  assert.equal(normalizePublicProjectFacts({ ...row, status: "For Review", stage: "Procurement" }, now)?.publicStage, "bidding");
});

test("applies the analytics budget and contractor rules to detail facts", () => {
  assert.equal(normalizePublicProjectFacts(row, now)?.budget, 1000000);
  for (const budget of [null, "0", "-1", "2000000000", "invalid", "50000000"]) {
    assert.equal(normalizePublicProjectFacts({ ...row, budget }, now)?.budget, null);
  }
  assert.equal(normalizePublicProjectFacts({ ...row, contractorName: "Write here (Cell C4)..." }, now)?.contractor, "Unavailable");
});

test("does not expose invalid, implausible, or reversed dates", () => {
  const facts = normalizePublicProjectFacts({
    ...row,
    startDate: new Date("2025-08-01"),
    actualCompletionDate: new Date("2025-01-01"),
    targetCompletionDate: new Date("2099-01-01"),
    dateTurnOver: "0022-01-01",
  }, now)!;
  assert.equal(facts.startDate, "Unavailable");
  assert.equal(facts.actualCompletionDate, undefined);
  assert.equal(facts.completionDate, "Unavailable");
  assert.equal(facts.dateTurnOver, undefined);
  assert.equal(normalizePublicProjectFacts({ ...row, startDate: new Date(NaN) }, now)?.startDate, "Unavailable");
});

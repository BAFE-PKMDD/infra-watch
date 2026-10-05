import assert from "node:assert/strict";
import { test } from "bun:test";
import { parseReportRange } from "./date-range";
import { buildFeedbackSlaReport, buildIssueSlaReport } from "./sla";

const hour = 3_600_000;
const createdAt = new Date("2026-10-01T08:00:00+08:00");
const now = new Date(createdAt.getTime() + 96 * hour);
const range = parseReportRange({ from: "2026-10-01", to: "2026-10-05" });
const issue = { id: "i", ticketNumber: "TEST-1", status: "reviewing", category: "quality", farmOperation: null, createdAt, resolvedAt: null };
const reply = { issueId: "i", createdAt: new Date(createdAt.getTime() + hour), isInternalOnly: false, responderId: "staff-1", responderRole: "admin" };
const feedback = { id: "f", comment: "A concern", status: "approved", category: "concerns", createdAt, moderatedAt: new Date(createdAt.getTime() + hour), moderatedBy: "staff-1" };

test("excludes automated replies, internal notes, and invalid earlier timestamps from first response", () => {
  const replies = [
    { ...reply, createdAt: new Date(createdAt.getTime() + 4 * hour) },
    { ...reply, responderId: "system-auto-acceptance", responderRole: null, createdAt },
    { ...reply, responderId: "another-bot", responderRole: "system", createdAt },
    { ...reply, isInternalOnly: true, createdAt },
    { ...reply, createdAt: new Date(createdAt.getTime() - hour) },
    reply,
  ];
  const data = buildIssueSlaReport([issue], replies, range, now);
  assert.equal(data.tableData[0].responseTimeMs, hour);
  assert.equal(data.tableData[0].firstResponseAt?.getTime(), reply.createdAt.getTime());
  assert.equal(data.summary.respondedItems, 1);
});

test("averages the two middle response times for even counts and keeps an odd median", () => {
  const records = [1, 3, 9].map((h) => ({ ...feedback, id: String(h), moderatedAt: new Date(createdAt.getTime() + h * hour) }));
  assert.equal(buildFeedbackSlaReport(records.slice(0, 2), range, now).summary.medianResponseTime, 2 * hour);
  assert.equal(buildFeedbackSlaReport(records, range, now).summary.medianResponseTime, 3 * hour);
});

test("flags overdue unanswered issues and feedback, including automatic acceptance", () => {
  const issueReport = buildIssueSlaReport([issue], [{ ...reply, responderId: "system-auto-acceptance", responderRole: "system" }], range, now);
  assert.equal(issueReport.tableData[0].isSlaBreach, true);
  assert.equal(issueReport.tableData[0].responseTimeMs, null);
  assert.equal(issueReport.tableData[0].firstResponseAt, null);
  const feedbackReport = buildFeedbackSlaReport([{ ...feedback, moderatedBy: "system-auto-acceptance" }], range, now);
  assert.equal(feedbackReport.tableData[0].isSlaBreach, true);
  assert.equal(feedbackReport.summary.respondedItems, 0);
  assert.equal(feedbackReport.tableData[0].resolvedAt, null);
  assert.equal(feedbackReport.summary.avgResolutionTime, null);
});

test("keeps unanswered items within the SLA pending and measures completed response duration", () => {
  const recent = new Date(createdAt.getTime() + 12 * hour);
  assert.equal(buildIssueSlaReport([issue], [], range, recent).tableData[0].isSlaBreach, false);
  assert.equal(buildIssueSlaReport([issue], [reply], range, now).tableData[0].isSlaBreach, false);
  const late = { ...reply, createdAt: new Date(createdAt.getTime() + 73 * hour) };
  assert.equal(buildIssueSlaReport([issue], [late], range, now).tableData[0].isSlaBreach, true);
});

test("represents missing response averages as null and preserves legitimate zero-duration responses", () => {
  const missing = buildIssueSlaReport([issue], [], range, now);
  assert.equal(missing.summary.avgResponseTime, null);
  assert.equal(missing.summary.medianResponseTime, null);
  assert.equal(missing.summary.maxResponseTime, null);
  assert.ok(missing.trend.every((point) => point.avgResponseTime === null));
  const immediate = buildIssueSlaReport([issue], [{ ...reply, createdAt }], range, now);
  assert.equal(immediate.summary.avgResponseTime, 0);
  assert.equal(immediate.summary.respondedItems, 1);
  assert.equal(immediate.distribution[0].count, 1);
  assert.equal(immediate.trend[0].avgResponseTime, 0);
});

test("groups submissions by Manila calendar day independently of the server timezone", () => {
  const midnight = new Date("2026-09-30T16:15:00Z");
  const data = buildIssueSlaReport([{ ...issue, createdAt: midnight }], [{ ...reply, createdAt: new Date(midnight.getTime() + hour) }], range, now);
  assert.equal(data.trend[0].date, "2026-10-01");
  assert.equal(data.trend[0].itemCount, 1);
  assert.equal(data.trend[0].avgResponseTime, 1);
  assert.equal(data.trend.length, 5);
});

test("populates feedback resolution durations and excludes unattributed or invalid decisions", () => {
  const data = buildFeedbackSlaReport([
    feedback,
    { ...feedback, id: "unknown", moderatedBy: null },
    { ...feedback, id: "invalid", moderatedAt: new Date(createdAt.getTime() - hour) },
  ], range, now);
  assert.equal(data.summary.avgResolutionTime, hour);
  assert.equal(data.summary.respondedItems, 1);
  assert.ok(Math.abs(data.summary.resolutionRate! - 100 / 3) < 1e-10);
  assert.equal(data.tableData[0].resolutionTimeMs, hour);
  assert.equal(data.tableData[2].firstResponseAt, null);
});

test("does not count an issue resolution earlier than submission", () => {
  const data = buildIssueSlaReport([{ ...issue, resolvedAt: new Date(createdAt.getTime() - hour) }], [], range, now);
  assert.equal(data.summary.resolutionRate, 0);
  assert.equal(data.summary.avgResolutionTime, null);
  assert.equal(data.tableData[0].resolvedAt, null);
});

test("empty reports retain a real zero volume with unavailable durations", () => {
  const data = buildFeedbackSlaReport([], range, now);
  assert.equal(data.summary.totalItems, 0);
  assert.equal(data.summary.avgResponseTime, null);
  assert.equal(data.summary.resolutionRate, null);
  assert.equal(data.distribution.reduce((total, tier) => total + tier.count, 0), 0);
});

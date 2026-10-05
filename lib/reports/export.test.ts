import assert from "node:assert/strict";
import { test } from "bun:test";
import { buildSlaCsv, buildSlaPdfRows } from "./export";
import { formatReportTimestamp, slaStatus } from "./format";
import type { SlaTableRow } from "@/types/reports.types";

const pending: SlaTableRow = { id: "i", referenceId: 'Test "quoted", report', status: "reviewing", createdAt: new Date("2026-10-01T00:30:00Z"), firstResponseAt: null, responseTimeMs: null, isSlaBreach: false };

test("CSV preserves unavailable response times, zero durations, and overdue status", () => {
  const csv = buildSlaCsv([pending, { ...pending, id: "overdue", isSlaBreach: true }, { ...pending, id: "zero", responseTimeMs: 0, firstResponseAt: pending.createdAt }]);
  const lines = csv.split("\n");
  assert.match(lines[0], /Asia\/Manila/);
  assert.match(lines[1], /"Unavailable","No","Awaiting staff response"$/);
  assert.match(lines[1], /"Test ""quoted"", report"/);
  assert.match(lines[2], /"Unavailable","Yes","Breached"$/);
  assert.match(lines[3], /"0","No","Within SLA"$/);
});

test("PDF distinguishes pending and overdue items from responded items", () => {
  const rows = buildSlaPdfRows([pending, { ...pending, isSlaBreach: true }, { ...pending, responseTimeMs: 0 }]);
  assert.equal(rows[0][6], "Unavailable");
  assert.equal(rows[0][7], "Awaiting staff response");
  assert.equal(rows[1][7], "Breached");
  assert.equal(rows[2][6], "0m");
  assert.equal(rows[2][7], "Within SLA");
});

test("export dates always use Manila time and missing response status stays explicit", () => {
  assert.equal(formatReportTimestamp(pending.createdAt), "2026-10-01 08:30:00");
  assert.equal(slaStatus(pending), "Awaiting staff response");
});

import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SlaSummaryCards } from "./sla-summary-cards";
import { SlaDataTable } from "./sla-data-table";
import { SlaResponseChart } from "./sla-response-chart";
import { SlaDistributionChart } from "./sla-distribution-chart";
import { buildIssueSlaReport } from "@/lib/reports/sla";
import { parseReportRange } from "@/lib/reports/date-range";

const range = parseReportRange({ from: "2026-10-01", to: "2026-10-05" });
const data = buildIssueSlaReport([{ id: "test", ticketNumber: "TEST-1", status: "reviewing", category: "quality", farmOperation: null, createdAt: new Date("2026-10-01T08:00:00+08:00"), resolvedAt: null }], [], range, new Date("2026-10-05T08:00:00+08:00"));

test("summary cards show unavailable response metrics and their actual denominator", () => {
  const html = renderToStaticMarkup(<SlaSummaryCards summary={data.summary} title="Test report" />);
  assert.equal((html.match(/>Unavailable</g) ?? []).length, 3);
  assert.match(html, /0 staff responses out of 1 submissions/);
  assert.doesNotMatch(html, />0h</);
});

test("tables expose the overdue status and unavailable timestamps", () => {
  const html = renderToStaticMarkup(<SlaDataTable data={data.tableData} />);
  assert.match(html, /Breached/);
  assert.match(html, /Unavailable/);
  assert.match(html, /2026-10-01 08:00:00/);
  assert.match(html, /scroll horizontally/);
  assert.match(html, /tabindex="0"/);
});

test("charts show explicit no-response states rather than a zero-hour graph", () => {
  for (const html of [
    renderToStaticMarkup(<SlaResponseChart data={data.trend} title="Trend" />),
    renderToStaticMarkup(<SlaDistributionChart data={data.distribution} title="Distribution" />),
  ]) {
    assert.match(html, /No staff responses recorded/);
    assert.match(html, /role="status"/);
  }
});

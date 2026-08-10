import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExecutiveInsights, applyInsightFilter } from "./executive-insights";
import { PriorityProjectsTable } from "./priority-projects-table";

test("renders at most three actionable insights and applies a trusted filter", () => {
  const insights = Array.from({ length: 4 }, (_, index) => ({
    severity: index === 0 ? "critical" as const : "warning" as const,
    title: `Insight ${index + 1}`,
    detail: `Detail ${index + 1}`,
    filter: index === 0 ? { health: "delayed" as const } : undefined,
  }));
  const html = renderToStaticMarkup(createElement(ExecutiveInsights, { insights, onApplyFilter: () => undefined }));
  assert.match(html, /Insight 1/);
  assert.match(html, /Insight 3/);
  assert.doesNotMatch(html, /Insight 4/);
  assert.match(html, /Show affected projects/);

  let selected: unknown;
  applyInsightFilter((filter) => { selected = filter; }, { health: "delayed" });
  assert.deepEqual(selected, { health: "delayed" });
});

test("renders a keyboard-usable priority table with reason and canonical project links", () => {
  const html = renderToStaticMarkup(createElement(PriorityProjectsTable, {
    projects: [{
      projectId: "ABEMIS 123",
      projectName: "Farm-to-market road",
      program: "AMEFIP",
      region: "Region VIII",
      province: "Leyte",
      projectType: "Road",
      allocatedBudget: 10_000_000,
      physicalProgress: 42,
      targetCompletionDate: "2026-08-01T00:00:00.000Z",
      daysToTarget: -9,
      scheduleVariance: -24,
      health: "delayed",
      reason: "9 days overdue",
      forecast: {
        status: "projected",
        projectedCompletionDate: "2026-10-15",
        confidence: "high",
        targetRisk: true,
      },
    }],
  }));
  assert.match(html, /Priority projects/);
  assert.match(html, /9 days overdue/);
  assert.match(html, /₱|PHP/);
  assert.match(html, /42%/);
  assert.match(html, /Projected completion/i);
  assert.match(html, /Oct 15, 2026/);
  assert.match(html, /high confidence/i);
  assert.match(html, /href="\/projects\/ABEMIS%20123"/);
  assert.doesNotMatch(html, /reporter|contact|email/i);
});

test("priority table has a truthful empty state", () => {
  assert.match(
    renderToStaticMarkup(createElement(PriorityProjectsTable, { projects: [] })),
    /No delayed or at-risk projects/,
  );
});

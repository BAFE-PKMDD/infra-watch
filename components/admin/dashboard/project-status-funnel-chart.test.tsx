import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectStatusFunnelChart } from "./project-status-funnel-chart";

const data = [
  { key: "planned" as const, count: 100, allocatedBudget: 1_000_000 },
  { key: "ongoing" as const, count: 50, allocatedBudget: 500_000 },
  { key: "completed" as const, count: 850, allocatedBudget: 8_000_000 },
  { key: "suspended" as const, count: 0, allocatedBudget: 0 },
];

test("renders the stage split with counts and budget, hiding zero-count stages", () => {
  const html = renderToStaticMarkup(createElement(ProjectStatusFunnelChart, { data }));

  assert.match(html, /Where are the projects now\?/);
  assert.match(html, /Not yet started/);
  assert.match(html, /Completed/);
  assert.match(html, /1,000 total projects/);
  assert.doesNotMatch(html, />Suspended</);
});

test("shows an explicit unavailable state when the backend has not returned this breakdown", () => {
  const html = renderToStaticMarkup(createElement(ProjectStatusFunnelChart, { data: undefined }));

  assert.match(html, /Stage split is unavailable/);
  assert.match(html, /not available for this dashboard response/);
});

test("shows the empty state when nothing has a nonzero count", () => {
  const html = renderToStaticMarkup(createElement(ProjectStatusFunnelChart, {
    data: [
      { key: "planned", count: 0, allocatedBudget: 0 },
      { key: "ongoing", count: 0, allocatedBudget: 0 },
      { key: "completed", count: 0, allocatedBudget: 0 },
      { key: "suspended", count: 0, allocatedBudget: 0 },
    ],
  }));

  assert.match(html, /No data available/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RegionTotalsChart } from "./region-totals-chart";

const data = [
  { region: "Region III", total: 1200, assessed: 900, completed: 900, delayed: 58, atRisk: 0, completionRate: 75, allocatedBudget: 5_000_000 },
  { region: "NCR", total: 44, assessed: 44, completed: 36, delayed: 1, atRisk: 0, completionRate: 82, allocatedBudget: 1_000_000 },
];

test("ranks regions and offers a projects/budget toggle", () => {
  const html = renderToStaticMarkup(createElement(RegionTotalsChart, { data }));

  assert.match(html, /How are projects and budget spread across regions\?/);
  assert.match(html, /Projects/);
  assert.match(html, /Budget/);
  assert.match(html, /1,200 projects/);
});

test("shows the empty state with no regions", () => {
  const html = renderToStaticMarkup(createElement(RegionTotalsChart, { data: [] }));
  assert.match(html, /No data available/);
});

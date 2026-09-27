import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StatusByYearChart } from "./status-by-year-chart";

const data = [
  {
    yearFunded: "2023",
    counts: { planned: 2, ongoing: 5, completed: 10, suspended: 1 },
    allocatedBudget: { planned: 200_000, ongoing: 500_000, completed: 1_000_000, suspended: 50_000 },
  },
  {
    yearFunded: "Unknown",
    counts: { planned: 1, ongoing: 0, completed: 0, suspended: 0 },
    allocatedBudget: { planned: 10_000, ongoing: 0, completed: 0, suspended: 0 },
  },
];

test("renders the status-by-year breakdown with a projects/budget toggle", () => {
  const html = renderToStaticMarkup(createElement(StatusByYearChart, { data }));

  assert.match(html, /status mix shifting by funding year\?/);
  assert.match(html, /10 completed/);
  assert.match(html, /Projects/);
  assert.match(html, /Budget/);
  assert.doesNotMatch(html, />Unknown</);
});

test("shows an explicit unavailable state when the backend has not returned this breakdown", () => {
  const html = renderToStaticMarkup(createElement(StatusByYearChart, { data: undefined }));

  assert.match(html, /Status by funding year is unavailable/);
  assert.match(html, /not available for this dashboard response/);
});

test("shows the empty state when every year is filtered out", () => {
  const html = renderToStaticMarkup(createElement(StatusByYearChart, {
    data: [{ yearFunded: "Unknown", counts: { planned: 0, ongoing: 0, completed: 0, suspended: 0 }, allocatedBudget: { planned: 0, ongoing: 0, completed: 0, suspended: 0 } }],
  }));

  assert.match(html, /No data available/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RegionCategoryHeatTable } from "./region-category-heat-table";

const data = [
  {
    region: "Region III",
    categories: {
      "Irrigation System": { count: 120, budget: 5_000_000 },
      "Storage Facility": { count: 10, budget: 500_000 },
      "Unclassified": { count: 0, budget: 0 },
    },
  },
  {
    region: "Unknown",
    categories: {
      "Irrigation System": { count: 3, budget: 10_000 },
      "Storage Facility": { count: 0, budget: 0 },
      "Unclassified": { count: 0, budget: 0 },
    },
  },
];

test("renders a region-by-category matrix and excludes the Unknown region", () => {
  const html = renderToStaticMarkup(createElement(RegionCategoryHeatTable, { data }));

  assert.match(html, /What does each region build\?/);
  assert.match(html, /Region III/);
  assert.match(html, /Irrigation System/);
  assert.match(html, /120/);
  assert.doesNotMatch(html, /<th[^>]*>Unknown</);
});

test("shows an explicit unavailable state when the backend has not returned this breakdown", () => {
  const html = renderToStaticMarkup(createElement(RegionCategoryHeatTable, { data: undefined }));

  assert.match(html, /Region-by-category data is unavailable/);
});

test("shows the empty state when every region is filtered out", () => {
  const html = renderToStaticMarkup(createElement(RegionCategoryHeatTable, {
    data: [{ region: "Unknown", categories: { "Irrigation System": { count: 1, budget: 100 } } }],
  }));

  assert.match(html, /No data available/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RegionCostByTypeChart } from "./region-cost-by-type-chart";

function renderWithQueryClient(element: ReactElement) {
  const client = new QueryClient();
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, element));
}

test("prompts for a project type before any type is chosen, excluding types that could never clear the per-region floor", () => {
  const html = renderWithQueryClient(createElement(RegionCostByTypeChart, {
    projectTypes: [
      { projectType: "Greenhouse", total: 1094, allocatedBudget: 1_000_000, delayed: 10 },
      { projectType: "Unknown", total: 500, allocatedBudget: 1_000_000, delayed: 1 },
      { projectType: "Warehouse", total: 200, allocatedBudget: 1_000_000, delayed: 5 },
      { projectType: "Root Crops Processing Facility", total: 3, allocatedBudget: 100_000, delayed: 0 },
    ],
    filters: {},
    viewerKey: "u1",
  }));
  assert.match(html, /How much the same facility costs in each region/);
  assert.match(html, /Choose a project type/);
  assert.match(html, /Greenhouse/);
  assert.match(html, /Warehouse/);
  assert.doesNotMatch(html, /<option value="Unknown"/);
  assert.doesNotMatch(html, /Root Crops Processing Facility/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildDrillthroughSelection,
  DashboardDrillthroughResults,
} from "./dashboard-drillthrough-dialog";

const data = {
  asOf: "2026-08-26",
  total: 2,
  page: 1,
  pageSize: 25,
  projects: [
    {
      projectId: "P-001",
      projectName: "Farm-to-market road",
      program: "AMEFIP",
      region: "Region VIII",
      province: "Leyte",
      projectType: "Road",
      status: "ongoing" as const,
      health: "delayed" as const,
      allocatedBudget: 12_500_000,
      physicalProgress: 40,
      expectedProgress: null,
      variance: null,
      targetCompletionDate: "2026-08-01T00:00:00.000Z",
      ntpDate: "2025-06-15T00:00:00.000Z",
      calendarDays: 412,
    },
  ],
};

test("builds exact chart drill-through filters while preserving active dashboard scope", () => {
  const base = { program: "AMEFIP", province: "Cebu" } as const;
  assert.deepEqual(buildDrillthroughSelection(base, {
    kind: "schedule",
    health: "delayed",
    label: "Delayed",
  }), {
    title: "Delayed projects",
    description: "Projects classified as delayed under the current dashboard filters.",
    filters: { program: "AMEFIP", province: "Cebu", health: "delayed" },
  });

  assert.deepEqual(buildDrillthroughSelection(base, {
    kind: "delayedRegion",
    region: "Region VIII",
  }).filters, { program: "AMEFIP", region: "Region VIII", health: "delayed" });

  assert.deepEqual(buildDrillthroughSelection({}, {
    kind: "regionalMetric",
    region: "NCR",
    metric: "completed",
  }).filters, { region: "NCR", status: "completed" });

  assert.deepEqual(buildDrillthroughSelection({ program: "AMEFIP" }, {
    kind: "projectType",
    projectType: "Other",
    excludedProjectTypes: ["Warehouse", "Diversion Dam"],
  }), {
    title: "Projects in smaller project types",
    description: "Projects represented by the combined Other budget-allocation bar under the current dashboard filters.",
    filters: { program: "AMEFIP" },
    options: { otherProjectTypes: { excluded: ["Warehouse", "Diversion Dam"] } },
  });
});

test("renders project-level details, filter context, canonical links, and NTP info", () => {
  const html = renderToStaticMarkup(createElement(DashboardDrillthroughResults, {
    data,
    filters: { program: "AMEFIP", region: "Region VIII", health: "delayed" },
    allProjects: data.projects,
    hasMore: false,
    loadingMore: false,
    sentinelRef: () => undefined,
  }));
  assert.match(html, /2 projects represented by this value/);
  assert.match(html, /Program:<\/strong> AMEFIP/);
  assert.match(html, /Region:<\/strong> Region VIII/);
  assert.match(html, /Farm-to-market road/);
  assert.match(html, /₱12,500,000/);
  assert.match(html, /40\.0%/);
  assert.match(html, /Delayed/);
  assert.match(html, /\/projects\/P-001/);
  assert.match(html, /NTP:/);
  assert.match(html, /412 CD/);
});

test("distinguishes an empty result from a loading failure", () => {
  const html = renderToStaticMarkup(createElement(DashboardDrillthroughResults, {
    data: { ...data, total: 0, projects: [] },
    filters: { health: "notAssessed" },
    allProjects: [],
    hasMore: false,
    loadingMore: false,
    sentinelRef: () => undefined,
  }));
  assert.match(html, /No projects match this chart value and the active dashboard filters/);
});

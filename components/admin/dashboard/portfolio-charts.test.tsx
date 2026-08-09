import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectTypeBudgetChart, limitProjectTypes } from "./project-type-budget-chart";
import { ProgressVarianceChart } from "./progress-variance-chart";
import { RegionalPerformanceChart } from "./regional-performance-chart";
import { ScheduleHealthChart, selectScheduleHealth } from "./schedule-health-chart";

const healthData = [
  { key: "onTrack" as const, count: 5, budget: 1_000_000 },
  { key: "atRisk" as const, count: 2, budget: 500_000 },
  { key: "delayed" as const, count: 1, budget: 250_000 },
  { key: "notAssessed" as const, count: 3, budget: 0 },
];

test("renders accessible titles, summaries, and keyboard filter alternatives", () => {
  const schedule = renderToStaticMarkup(createElement(ScheduleHealthChart, { data: healthData, onSelect: () => undefined }));
  const types = renderToStaticMarkup(createElement(ProjectTypeBudgetChart, {
    data: [{ projectType: "Unknown", total: 2, allocatedBudget: 123_000, delayed: 1 }],
    onSelect: () => undefined,
  }));
  const regions = renderToStaticMarkup(createElement(RegionalPerformanceChart, {
    data: [{ region: "Region VIII", total: 10, assessed: 8, completed: 4, delayed: 2, atRisk: 1, completionRate: 40, allocatedBudget: 10_000 }],
    onSelect: () => undefined,
  }));
  const variance = renderToStaticMarkup(createElement(ProgressVarianceChart, {
    data: [{ projectId: "p1", projectName: "Road rehabilitation", expectedProgress: 70, physicalProgress: 45, variance: -25, health: "atRisk" }],
  }));

  assert.match(schedule, /Schedule health distribution/);
  assert.match(schedule, /5 on track/);
  assert.match(schedule, /data-filter-value="delayed"/);
  assert.match(types, /Budget allocation by project type/);
  assert.match(types, /Unknown/);
  assert.match(types, /₱|PHP/);
  assert.match(regions, /Regional performance ranking/);
  assert.match(regions, /40\.0%/);
  assert.match(regions, /4 completed of 10/);
  assert.match(variance, /Physical versus expected progress/);
  assert.match(variance, /25\.0 points behind/);
});

test("renders explicit empty states instead of empty charts", () => {
  for (const element of [
    createElement(ScheduleHealthChart, { data: [], onSelect: () => undefined }),
    createElement(ProjectTypeBudgetChart, { data: [], onSelect: () => undefined }),
    createElement(RegionalPerformanceChart, { data: [], onSelect: () => undefined }),
    createElement(ProgressVarianceChart, { data: [] }),
  ]) {
    assert.match(renderToStaticMarkup(element), /No data available/);
  }
});

test("schedule-health selection calls the shared filter callback", () => {
  let selected: string | undefined;
  selectScheduleHealth((health) => { selected = health; }, "atRisk");
  assert.equal(selected, "atRisk");
});

test("limits long project-type lists while preserving totals in Other and Unknown", () => {
  const data = Array.from({ length: 10 }, (_, index) => ({
    projectType: index === 9 ? "Unknown" : `Type ${index}`,
    total: 1,
    allocatedBudget: 100 + index,
    delayed: index % 2,
  }));
  const limited = limitProjectTypes(data, 5);
  assert.equal(limited.length, 5);
  assert.ok(limited.some((item) => item.projectType === "Unknown"));
  const other = limited.find((item) => item.projectType === "Other");
  assert.ok(other);
  assert.equal(
    limited.reduce((sum, item) => sum + item.allocatedBudget, 0),
    data.reduce((sum, item) => sum + item.allocatedBudget, 0),
  );
});

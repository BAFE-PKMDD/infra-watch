import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DelayedProjectsByRegionChart, rankDelayedRegions } from "./delayed-projects-by-region-chart";
import { ProjectTypeBudgetChart, formatProjectTypeAxisLabel, limitProjectTypes, selectProjectType } from "./project-type-budget-chart";
import { formatProgressDifference, ProgressVarianceChart } from "./progress-variance-chart";
import { formatRegionAxisLabel, limitRegionalPerformance, RegionalPerformanceChart } from "./regional-performance-chart";
import { ScheduleHealthChart, selectScheduleHealth } from "./schedule-health-chart";

const healthData = [
  { key: "onTrack" as const, count: 5, budget: 1_000_000 },
  { key: "atRisk" as const, count: 2, budget: 500_000 },
  { key: "delayed" as const, count: 1, budget: 250_000 },
  { key: "notAssessed" as const, count: 3, budget: 0 },
];

test("renders accessible titles with keyboard filter and drill-through alternatives", () => {
  const schedule = renderToStaticMarkup(createElement(ScheduleHealthChart, { data: healthData, onSelect: () => undefined, onDrillthrough: () => undefined }));
  const types = renderToStaticMarkup(createElement(ProjectTypeBudgetChart, {
    data: [{ projectType: "Unknown", total: 2, allocatedBudget: 123_000, delayed: 1 }],
    onSelect: () => undefined,
    onDrillthrough: () => undefined,
  }));
  const regions = renderToStaticMarkup(createElement(RegionalPerformanceChart, {
    data: [{ region: "Region VIII", total: 10, assessed: 8, completed: 4, delayed: 2, atRisk: 1, completionRate: 40, allocatedBudget: 10_000 }],
    onSelect: () => undefined,
    onDrillthrough: () => undefined,
  }));
  const variance = renderToStaticMarkup(createElement(ProgressVarianceChart, {
    data: [{ projectId: "p1", projectName: "Road rehabilitation", expectedProgress: 70, physicalProgress: 45, variance: -25, health: "atRisk" }],
  }));

  assert.match(schedule, /Are projects on schedule\?/);
  assert.match(schedule, /5 on schedule/);
  assert.match(schedule, /At risk of delay/);
  assert.match(schedule, /Choose a schedule status/);
  assert.match(schedule, /value="delayed"/);
  assert.match(schedule, /aria-label="View projects by schedule status"/);
  assert.match(schedule, /Filter dashboard/);
  assert.match(types, /Budget Allocation by Project Type/);
  assert.match(types, /Unknown/);
  assert.match(types, /₱|PHP/);
  assert.match(types, /aria-label="View projects by project type"/);
  assert.match(regions, /Regional performance ranking/);
  assert.match(regions, /40\.0%/);
  assert.match(regions, /4 completed of 10/);
  assert.match(regions, /Choose a region and value/);
  assert.match(variance, /Is reported progress keeping pace\?/);
  assert.match(variance, /Reported progress/);
  assert.match(variance, /Expected by now/);
  assert.match(variance, /25\.0 percentage points behind/);
  assert.match(variance, /assumes work advances evenly/);
  assert.doesNotMatch(variance, /Physical versus expected progress/);
});

test("renders explicit empty states instead of empty charts", () => {
  for (const element of [
    createElement(ScheduleHealthChart, { data: [], onSelect: () => undefined }),
    createElement(ProjectTypeBudgetChart, { data: [], onSelect: () => undefined }),
    createElement(RegionalPerformanceChart, { data: [], onSelect: () => undefined }),
  ]) {
    assert.match(renderToStaticMarkup(element), /No data available/);
  }
});

test("ranks confirmed delayed projects by region and distinguishes insufficient coverage", () => {
  const data = [
    { region: "Region VIII", total: 10, assessed: 8, completed: 4, delayed: 2, atRisk: 1, completionRate: 40, allocatedBudget: 10_000 },
    { region: "Bicol Region", total: 20, assessed: 18, completed: 3, delayed: 7, atRisk: 2, completionRate: 15, allocatedBudget: 20_000 },
  ];
  assert.deepEqual(rankDelayedRegions(data).map((item) => item.region), ["Bicol Region", "Region VIII"]);
  const html = renderToStaticMarkup(createElement(DelayedProjectsByRegionChart, { data, onDrillthrough: () => undefined }));
  assert.match(html, /Delayed Projects by Region/);
  assert.match(html, /7 delayed projects/);
  assert.match(html, /aria-label="View delayed projects by region"/);
  const insufficient = renderToStaticMarkup(createElement(DelayedProjectsByRegionChart, {
    data: [{ ...data[0], assessed: 0, delayed: 0 }],
  }));
  assert.match(insufficient, /Delayed-project data unavailable/);
  assert.match(insufficient, /sufficient schedule data/);
  const partialZero = renderToStaticMarkup(createElement(DelayedProjectsByRegionChart, {
    data: [{ ...data[0], assessed: 1, delayed: 0 }],
  }));
  assert.match(partialZero, /No confirmed regional delays/);
  assert.match(partialZero, /1 of 10 projects assessed/);
  assert.doesNotMatch(partialZero, /No delayed projects for the current filters/);
});

test("explains progress differences without analytical jargon", () => {
  const base = { projectId: "p1", projectName: "Road", expectedProgress: 50, physicalProgress: 50, health: "onTrack" as const };
  assert.equal(formatProgressDifference({ ...base, variance: -4.5 }), "4.5 percentage points behind");
  assert.equal(formatProgressDifference({ ...base, variance: 4.5 }), "4.5 percentage points ahead");
  assert.equal(formatProgressDifference({ ...base, variance: 0 }), "On the expected pace");
});

test("explains an empty progress comparison in plain language", () => {
  const html = renderToStaticMarkup(createElement(ProgressVarianceChart, { data: [] }));
  assert.match(html, /No projects can be compared yet/);
  assert.match(html, /ongoing project with valid start and target dates and reported physical progress/i);
  assert.doesNotMatch(html, /progress-variance|assessable active projects/i);
});

test("bounds regional rankings to the strongest and weakest performers", () => {
  const data = Array.from({ length: 14 }, (_, index) => ({
    region: `Region ${index + 1}`,
    total: 100,
    assessed: 80,
    completed: index * 5,
    delayed: 2,
    atRisk: 1,
    completionRate: index * 5,
    allocatedBudget: 1_000_000,
  }));
  const limited = limitRegionalPerformance(data, 10);

  assert.equal(limited.length, 10);
  assert.equal(new Set(limited.map((item) => item.region)).size, 10);
  assert.ok(limited.some((item) => item.region === "Region 1"));
  assert.ok(limited.some((item) => item.region === "Region 14"));
  assert.deepEqual(limitRegionalPerformance(data, 1).map((item) => item.region), ["Region 14"]);
});

test("keeps long regional axis labels within the chart gutter", () => {
  assert.equal(formatRegionAxisLabel("Bangsamoro Autonomous Region of Muslim Mindanao (BARMM)"), "BARMM");
  assert.ok(formatRegionAxisLabel("A very long regional name without an acronym").length <= 28);
});

test("keeps long project-type labels within the chart gutter", () => {
  assert.ok(formatProjectTypeAxisLabel("Village Type Corn Postharvest Processing Center (VTCPPC)").length <= 24);
});

test("schedule-health selection calls the shared filter callback", () => {
  let selected: string | undefined;
  selectScheduleHealth((health) => { selected = health; }, "atRisk");
  assert.equal(selected, "atRisk");
});

test("synthetic Other totals cannot be applied as a literal project-type filter", () => {
  let selected: string | undefined;
  selectProjectType((projectType) => { selected = projectType; }, "Other");
  assert.equal(selected, undefined);
  selectProjectType((projectType) => { selected = projectType; }, "Road");
  assert.equal(selected, "Road");
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

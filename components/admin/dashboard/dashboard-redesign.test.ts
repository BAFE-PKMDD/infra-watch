import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const pageSource = readFileSync(new URL("../../../app/(admin)/dashboard/page.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("./managerial-dashboard-client.tsx", import.meta.url), "utf8");
const skeletonSource = readFileSync(new URL("./dashboard-skeleton.tsx", import.meta.url), "utf8");
const aniaSource = readFileSync(new URL("./managerial-ai-copilot.tsx", import.meta.url), "utf8");

test("dashboard uses the infrastructure monitoring title and concise purpose", () => {
  assert.match(pageSource, /Infrastructure Monitoring/);
  assert.match(pageSource, /Monitor project status, budget utilization, and regional performance\./);
  assert.doesNotMatch(pageSource, /portfolio intelligence|surface bottlenecks|Infrastructure Analytics Dashboard/i);
});

test("overview keeps two primary charts and moves secondary analytics into a detailed section", () => {
  assert.match(dashboardSource, /DelayedProjectsByRegionChart/);
  assert.match(dashboardSource, /ProjectTypeBudgetChart/);
  assert.match(dashboardSource, /Detailed Analytics/);
  assert.match(dashboardSource, /Project timing, reported progress, and regional comparisons/);
  assert.match(dashboardSource, /ScheduleHealthChart/);
  assert.match(dashboardSource, /RegionalPerformanceChart/);
  assert.match(dashboardSource, /ProgressVarianceChart/);
});

test("dashboard action row uses the requested labels", () => {
  assert.match(aniaSource, /Ask ANIA/);
  assert.match(dashboardSource, /Executive Brief/);
  assert.match(dashboardSource, /Refresh/);
  assert.doesNotMatch(dashboardSource, />ABEMIS Sync</);
});

test("loading state mirrors the four-KPI flat overview", () => {
  assert.match(skeletonSource, /length: 4/);
  assert.match(skeletonSource, /xl:grid-cols-4/);
  assert.doesNotMatch(skeletonSource, /rounded-xl|xl:grid-cols-6/);
});

test("delayed-region chart has an operational title, units, tooltip, and empty state", () => {
  const chartUrl = new URL("./delayed-projects-by-region-chart.tsx", import.meta.url);
  assert.equal(existsSync(fileURLToPath(chartUrl)), true);
  const source = readFileSync(chartUrl, "utf8");
  assert.match(source, /Delayed Projects by Region/);
  assert.match(source, /projects/);
  assert.match(source, /ChartTooltip/);
  assert.match(source, /ChartEmptyState/);
});

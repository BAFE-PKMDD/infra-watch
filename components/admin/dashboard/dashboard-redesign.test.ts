import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const pageSource = readFileSync(new URL("../../../app/(admin)/dashboard/page.tsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("./managerial-dashboard-client.tsx", import.meta.url), "utf8");
const skeletonSource = readFileSync(new URL("./dashboard-skeleton.tsx", import.meta.url), "utf8");
const aniaSource = readFileSync(new URL("./managerial-ai-copilot.tsx", import.meta.url), "utf8");
const mobileNavSource = readFileSync(new URL("../admin-mobile-nav.tsx", import.meta.url), "utf8");
const dashboardCopySources = [
  "./executive-insights.tsx",
  "./data-coverage.tsx",
  "./executive-kpis.tsx",
  "./priority-projects-table.tsx",
  "./delayed-projects-by-region-chart.tsx",
  "./project-type-budget-chart.tsx",
  "./managerial-dashboard-client.tsx",
  "./managerial-ai-copilot.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
const dashboardControlSources = [
  "./dashboard-filters.tsx",
  "./priority-projects-table.tsx",
  "./delayed-projects-by-region-chart.tsx",
  "./project-type-budget-chart.tsx",
  "./regional-performance-chart.tsx",
  "./schedule-health-chart.tsx",
  "./dashboard-drillthrough-dialog.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

test("dashboard uses the infrastructure monitoring title and concise purpose", () => {
  assert.match(pageSource, /Infrastructure Monitoring/);
  assert.match(pageSource, /Monitor project delivery, approved budgets, and regional performance\./);
  assert.doesNotMatch(pageSource, /budget utilization/i);
  assert.doesNotMatch(pageSource, /portfolio intelligence|surface bottlenecks|Infrastructure Analytics Dashboard/i);
});

test("overview keeps two primary charts and moves secondary analytics into a detailed section", () => {
  assert.match(dashboardSource, /DelayedProjectsByRegionChart/);
  assert.match(dashboardSource, /ProjectTypeBudgetChart/);
  assert.match(dashboardSource, /Schedule and progress/);
  assert.match(dashboardSource, /Project timing, reported progress, and regional comparisons/);
  assert.match(dashboardSource, /ScheduleHealthChart/);
  assert.match(dashboardSource, /RegionalPerformanceChart/);
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
  assert.match(source, /Which regions have the most delayed projects\?/);
  assert.match(source, /projects/);
  assert.match(source, /ChartTooltip/);
  assert.match(source, /ChartEmptyState/);
});

test("dashboard controls meet the mobile touch-target baseline", () => {
  assert.doesNotMatch(dashboardControlSources, /className="h-[789] /);
  assert.match(dashboardControlSources, /className="h-11 /);
  assert.match(mobileNavSource, /min-h-11/);
});

test("dashboard metadata avoids the known low-contrast slate combinations", () => {
  assert.doesNotMatch(dashboardControlSources, /text-slate-400 dark:text-slate-500/);
});

test("wide project tables expose labelled keyboard-scroll regions", () => {
  assert.match(dashboardControlSources, /aria-label="Scrollable projects requiring review table"/);
  assert.match(dashboardControlSources, /aria-label="Scrollable project detail table"/);
  assert.match(dashboardControlSources, /tabIndex=\{0\}/);
  assert.match(dashboardControlSources, /Swipe or use Shift plus mouse wheel to view all columns/);
});

test("dashboard copy names the decision or evidence instead of generic dashboard sections", () => {
  assert.match(dashboardCopySources, /Projects needing attention/);
  assert.match(dashboardCopySources, /Data coverage/);
  assert.match(dashboardCopySources, /Projects requiring review/);
  assert.match(dashboardCopySources, /How is the approved budget distributed\?/);
  assert.doesNotMatch(dashboardCopySources, /Needs Attention|Data Completeness|Detailed Analytics|Priority Projects|More metrics|Portfolio exceptions|Source data coverage|Schedule and progress evidence|Additional portfolio measures|<Sparkles/);
});

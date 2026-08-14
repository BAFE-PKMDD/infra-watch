import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ExecutiveBriefAnalytics, summarizeForecastReadiness } from "./executive-brief-analytics";

const data: ManagerialDashboardData = {
  asOf: "2026-08-10",
  freshness: { lastSuccessfulSyncAt: "2026-08-10T01:00:00Z", latestSyncStatus: "success", isStale: false, staleAfterHours: 48 },
  coverage: { total: 10, withBudget: 9, withActualBidAmount: 8, withSchedule: 7, withPhysicalProgress: 6, withFinancialData: 8 },
  kpis: { totalProjects: 10, allocatedBudget: 1_000_000, actualBidAmount: 850_000, completionRate: 40, delayedProjects: 2, atRiskProjects: 1 },
  scheduleHealth: [
    { key: "onTrack", count: 4, budget: 300_000 }, { key: "atRisk", count: 1, budget: 200_000 },
    { key: "delayed", count: 2, budget: 400_000 }, { key: "notAssessed", count: 3, budget: 100_000 },
  ],
  statusBreakdown: [
    { key: "planned", count: 1, allocatedBudget: 100_000 }, { key: "ongoing", count: 5, allocatedBudget: 500_000 },
    { key: "completed", count: 4, allocatedBudget: 400_000 }, { key: "suspended", count: 0, allocatedBudget: 0 },
  ],
  regions: [{ region: "Region VIII", total: 10, assessed: 7, completed: 4, delayed: 2, atRisk: 1, completionRate: 40, allocatedBudget: 1_000_000 }],
  projectTypes: [{ projectType: "Farm-to-market road", total: 10, allocatedBudget: 1_000_000, delayed: 2 }],
  progressVariance: [{ projectId: "p-1", projectName: "Road package", expectedProgress: 80, physicalProgress: 50, variance: -30, health: "delayed" }],
  priorityProjects: [
    { projectId: "p-1", projectName: "Road package", program: "AMEFIP", region: "Region VIII", province: "Leyte", projectType: "Road", allocatedBudget: 400_000, physicalProgress: 50, targetCompletionDate: "2026-07-01", daysToTarget: -40, scheduleVariance: -30, health: "delayed", reason: "Behind expected progress", forecast: { status: "projected", projectedCompletionDate: "2026-10-01", confidence: "medium", targetRisk: true } },
    { projectId: "p-2", projectName: "Warehouse", program: "AMEFIP", region: "Region VIII", province: "Samar", projectType: "Storage", allocatedBudget: 200_000, physicalProgress: null, targetCompletionDate: null, daysToTarget: null, scheduleVariance: null, health: "notAssessed", reason: "Missing schedule evidence", forecast: { status: "insufficientHistory", projectedCompletionDate: null, confidence: null, targetRisk: null } },
  ],
  insights: [{ severity: "critical", title: "Delayed budget exposure", detail: "Two delayed projects account for ₱400,000.", filter: { health: "delayed" } }],
  filterOptions: { programs: ["AMEFIP"], years: ["2026"], regions: ["Region VIII"], provinces: ["Leyte"], projectTypes: ["Road"], statuses: ["planned", "ongoing", "completed", "suspended"] },
};

test("summarizes only evidence-backed forecast availability", () => {
  assert.deepEqual(summarizeForecastReadiness(data.priorityProjects), {
    projected: 1, targetRisk: 1, stalled: 0, insufficientHistory: 1,
    completed: 0, inactive: 0, total: 2,
  });
});

test("renders generated brief analytics as descriptive, diagnostic, predictive, and prescriptive evidence", () => {
  const html = renderToStaticMarkup(createElement(ExecutiveBriefAnalytics, { data }));
  for (const label of ["Descriptive analytics", "Diagnostic analytics", "Predictive analytics", "Prescriptive analytics"]) {
    assert.match(html, new RegExp(label, "i"));
  }
  assert.match(html, /Schedule health distribution/);
  assert.match(html, /Regional performance ranking/);
  assert.match(html, /1 of 2 priority projects have an evidence-backed projected completion date/);
  assert.match(html, /Insufficient history/);
  assert.match(html, /Priority projects/);
  assert.match(html, /Road package/);
});

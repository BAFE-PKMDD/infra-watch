import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ExecutiveKpis,
  formatDashboardCount,
  formatDashboardCurrency,
  formatDashboardPercentage,
} from "./executive-kpis";

test("formats Philippine currency, percentages, and counts", () => {
  assert.match(formatDashboardCurrency(1_250_000), /₱|PHP/);
  assert.match(formatDashboardCurrency(1_250_000), /1,250,000/);
  assert.equal(formatDashboardPercentage(12.345), "12.3%");
  assert.equal(formatDashboardCount(1234), "1,234");
});

test("renders six truthful executive KPIs without expenditure claims", () => {
  const html = renderToStaticMarkup(
    createElement(ExecutiveKpis, {
      kpis: {
        totalProjects: 42,
        allocatedBudget: 5_000_000,
        approvedBudgetForContract: 4_800_000,
        completionRate: 25,
        delayedProjects: 7,
        atRiskProjects: 3,
      },
      coverage: {
        total: 42,
        withBudget: 40,
        withSchedule: 35,
        withPhysicalProgress: 36,
        withFinancialData: 0,
      },
    }),
  );
  for (const label of [
    "Projects monitored",
    "Allocated budget",
    "Approved Budget for Contract",
    "Completion rate",
    "Delayed projects",
    "At-risk projects",
  ]) assert.match(html, new RegExp(label));
  assert.doesNotMatch(html, /spent|disbursed|expenditure|utilization/i);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ExecutiveKpis,
  formatDashboardCount,
  formatDashboardCompactCurrency,
  formatDashboardCurrency,
  formatDashboardPercentage,
} from "./executive-kpis";

test("formats Philippine currency, percentages, and counts", () => {
  assert.match(formatDashboardCurrency(1_250_000), /₱|PHP/);
  assert.match(formatDashboardCurrency(1_250_000), /1,250,000/);
  assert.equal(formatDashboardCompactCurrency(77_139_613_575), "₱77.14B");
  assert.equal(formatDashboardPercentage(12.345), "12.3%");
  assert.equal(formatDashboardCount(1234), "1,234");
});

test("renders four primary KPIs and keeps secondary metrics subordinate", () => {
  const html = renderToStaticMarkup(
    createElement(ExecutiveKpis, {
      kpis: {
        totalProjects: 42,
        allocatedBudget: 5_000_000,
        actualBidAmount: 4_800_000,
        completionRate: 25,
        delayedProjects: 7,
        atRiskProjects: 3,
      },
      assessedProjects: 35,
      coverage: {
        total: 42,
        withBudget: 40,
        withActualBidAmount: 0,
        withSchedule: 35,
        withPhysicalProgress: 36,
        withFinancialData: 0,
      },
    }),
  );
  for (const label of [
    "Total Projects",
    "Allocated Budget",
    "Completion Rate",
    "Delayed Projects",
  ]) assert.match(html, new RegExp(label));
  assert.equal((html.match(/data-primary-kpi=/g) ?? []).length, 4);
  assert.match(html, /More metrics/);
  assert.match(html, /Supplier Actual Bid Amount/);
  assert.match(html, /At-risk assessment/);
  assert.doesNotMatch(html, /spent|disbursed|expenditure|utilization/i);
  assert.doesNotMatch(html, /Approved Budget for Contract/i);
  assert.doesNotMatch(html, /Metric definition/);
});

test("does not present schedule-health zeroes as positive results when nothing is assessable", () => {
  const html = renderToStaticMarkup(
    createElement(ExecutiveKpis, {
      kpis: {
        totalProjects: 25_901,
        allocatedBudget: 77_139_613_575,
        actualBidAmount: 0,
        completionRate: 67.7,
        delayedProjects: 0,
        atRiskProjects: 0,
      },
      assessedProjects: 0,
      coverage: {
        total: 25_901,
        withBudget: 25_893,
        withActualBidAmount: 0,
        withSchedule: 0,
        withPhysicalProgress: 0,
        withFinancialData: 0,
      },
    }),
  );

  assert.equal((html.match(/Not assessable/g) ?? []).length, 2);
  assert.match(html, /0 of 25,901 projects have schedule dates/);
  assert.match(html, /title="₱77,139,613,575"/);
  assert.match(html, /Exact value: ₱77,139,613,575/);
});

test("does not present zero at-risk projects as confirmed when most projects are unassessed", () => {
  const html = renderToStaticMarkup(createElement(ExecutiveKpis, {
    kpis: {
      totalProjects: 100,
      allocatedBudget: 1_000_000,
      actualBidAmount: 900_000,
      completionRate: 60,
      delayedProjects: 4,
      atRiskProjects: 0,
    },
    assessedProjects: 7,
    coverage: {
      total: 100,
      withBudget: 100,
      withActualBidAmount: 70,
      withSchedule: 19,
      withPhysicalProgress: 30,
      withFinancialData: 0,
    },
  }));

  assert.match(html, /At-risk assessment unavailable/);
  assert.match(html, /Only 7 of 100 projects have sufficient data/);
  assert.doesNotMatch(html, />0<\/p>/);
});

test("qualifies a zero delayed count when schedule coverage is incomplete", () => {
  const html = renderToStaticMarkup(createElement(ExecutiveKpis, {
    kpis: {
      totalProjects: 100,
      allocatedBudget: 1_000_000,
      actualBidAmount: 900_000,
      completionRate: 60,
      delayedProjects: 0,
      atRiskProjects: 0,
    },
    assessedProjects: 1,
    coverage: {
      total: 100,
      withBudget: 100,
      withActualBidAmount: 70,
      withSchedule: 1,
      withPhysicalProgress: 1,
      withFinancialData: 0,
    },
  }));

  assert.match(html, /No confirmed delays/);
  assert.match(html, /1 of 100 projects have schedule data/);
});

test("keeps confirmed at-risk projects visible when assessment coverage is low", () => {
  const html = renderToStaticMarkup(createElement(ExecutiveKpis, {
    kpis: {
      totalProjects: 100,
      allocatedBudget: 1_000_000,
      actualBidAmount: 900_000,
      completionRate: 60,
      delayedProjects: 2,
      atRiskProjects: 3,
    },
    assessedProjects: 7,
    coverage: {
      total: 100,
      withBudget: 100,
      withActualBidAmount: 70,
      withSchedule: 19,
      withPhysicalProgress: 7,
      withFinancialData: 0,
    },
  }));

  assert.match(html, /3 confirmed/);
  assert.match(html, /3 confirmed among 7 of 100 assessed projects/);
  assert.doesNotMatch(html, /At-risk assessment unavailable/);
});

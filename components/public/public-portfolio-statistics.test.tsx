import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicPortfolioStatistics } from "./public-portfolio-statistics";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";

const result: InfraAnalyticsResult = {
  status: "ready",
  data: {
    asOfDate: "Aug 10, 2026, 10:15 PM",
    scopeLabel: "AMEFIP · Multiple funding years",
    totalTarget: 25_907,
    stages: {
      preImplementation: { labelKey: "preImplementation", count: 5_750, percentage: 22.19 },
      procurement: { labelKey: "procurement", count: 587, percentage: 2.27 },
      construction: { labelKey: "construction", count: 1_173, percentage: 4.53 },
      completed: { labelKey: "completed", count: 18_397, percentage: 71.01 },
      turnedOver: { labelKey: "turnedOver", count: 0, percentage: 0 },
    },
    regionalStats: [],
    bannerStats: [],
    summary: {
      approvedBudget: 24_500_000_000,
      budgetCoverage: { available: 20_000, total: 25_907 },
      completedOrTurnedOver: { count: 18_397, percentage: 71.01, total: 25_907 },
      mappedProjects: { count: 5_000, total: 25_907 },
    },
    source: {
      name: "ABEMIS infrastructure project feed",
      projectCount: 25_907,
      lastSuccessfulSync: "Aug 10, 2026, 10:15 PM",
    },
  },
};

test("renders public KPIs from the authoritative traceable analytics contract", () => {
  const html = renderToStaticMarkup(createElement(PublicPortfolioStatistics, { result }));
  assert.match(html, /25,907/);
  assert.match(html, /71\.01%/);
  assert.match(html, /₱24\.5B/);
  assert.match(html, /5,000/);
  assert.match(html, /ABEMIS infrastructure project feed/);
  assert.match(html, /Last successful sync/);
  assert.match(html, /20,000 of 25,907 projects have approved-budget data/);
});

test("never falls back to plausible figures when live statistics are unavailable", () => {
  const html = renderToStaticMarkup(createElement(PublicPortfolioStatistics, {
    result: { status: "unavailable", data: null },
  }));
  assert.match(html, /Statistics temporarily unavailable/);
  assert.doesNotMatch(html, /19,319|87\.4%|24\.5 Billion/);
});

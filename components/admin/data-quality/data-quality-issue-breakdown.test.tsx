import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataQualityIssueBreakdown } from "./data-quality-issue-breakdown";
import type { DataQualityReport } from "@/types/data-quality.types";

const summary: DataQualityReport["summary"] = {
  totalProjectsScanned: 100,
  projectsWithFindings: 8,
  totalIssues: 12,
  critical: 4,
  warning: 3,
  info: 5,
  cleanupCandidateCount: 1,
  latestSuccessfulSyncStartedAt: "2026-08-11T00:00:00.000Z",
  issueCounts: {
    missing_approved_budget: 20,
    missing_actual_bid_amount: 5,
    bid_exceeds_approved_budget: 0,
    missing_location: 3,
    invalid_coordinates: 0,
    duplicate_project_code: 1,
    stale_source_record: 0,
  },
};

test("ranks issue types by prevalence and shows their share of scanned projects", () => {
  const html = renderToStaticMarkup(createElement(DataQualityIssueBreakdown, { summary }));

  assert.match(html, /What kind of issues were found/);
  assert.match(html, /100 scanned projects/);
  assert.match(html, /Missing approved budget/);
  assert.match(html, /20\.0%/);
  const budgetIndex = html.indexOf("Missing approved budget");
  const locationIndex = html.indexOf("Missing location");
  assert.ok(budgetIndex < locationIndex, "higher-count issue should render first");
});

test("omits issue types with zero findings", () => {
  const html = renderToStaticMarkup(createElement(DataQualityIssueBreakdown, { summary }));

  assert.doesNotMatch(html, /Bid exceeds approved budget/);
  assert.doesNotMatch(html, /Invalid coordinates/);
  assert.doesNotMatch(html, /Not seen in latest successful sync/);
});

test("shows a clean state when nothing was found", () => {
  const clean: DataQualityReport["summary"] = {
    ...summary,
    issueCounts: {
      missing_approved_budget: 0,
      missing_actual_bid_amount: 0,
      bid_exceeds_approved_budget: 0,
      missing_location: 0,
      invalid_coordinates: 0,
      duplicate_project_code: 0,
      stale_source_record: 0,
    },
  };
  const html = renderToStaticMarkup(createElement(DataQualityIssueBreakdown, { summary: clean }));

  assert.match(html, /No issues were found in the scanned projects/);
});

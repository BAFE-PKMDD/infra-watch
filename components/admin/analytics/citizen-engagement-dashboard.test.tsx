import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CitizenEngagementDashboard } from "./citizen-engagement-dashboard";
import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";

const data: CitizenEngagementAnalytics = {
  range: { from: "2026-09-01", to: "2026-09-22", earliestAvailable: "2026-06-25", timeZone: "Asia/Manila", maximumDays: 90 },
  freshness: { generatedAt: "2026-09-22T10:00:00.000Z", eventRetentionDays: 90 },
  overview: {
    searches: 12,
    projectViews: 34,
    mapViews: 8,
    ratingsSubmitted: 5,
    commentsSubmitted: 7,
    averageRating: 4.2,
  },
  trend: [{ date: "2026-09-22", searches: 2, projectViews: 3, mapViews: 1, ratingsSubmitted: 1, commentsSubmitted: 1 }],
  projectDiscovery: {
    mostViewed: [{ projectId: "AMEFIP-1", projectName: "Farm-to-market road", count: 9 }],
    mostOpenedFromSearch: [],
    mostOpenedFromMap: [],
    searchResultBands: [{ band: "1_10", count: 6 }],
  },
  commonIssues: {
    feedbackThemes: [{ key: "quality", label: "Quality", count: 4 }],
    eReportTypes: [{ key: "construction_delay", label: "Construction delay", count: 3 }],
  },
  networkGeography: {
    minimumEventCount: 5,
    regions: [{ code: "PH130000000", count: 8 }],
  },
};

test("renders truthful metric labels, reporting context, and separate issue taxonomies", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={data} />);

  assert.match(html, /Completed searches/);
  assert.match(html, /Opened from search/);
  assert.doesNotMatch(html, /Most searched projects/);
  assert.match(html, /Asia\/Manila/);
  assert.match(html, /Activity metrics count actions, not unique people/);
  assert.match(html, /90 days/);
  assert.match(html, /Feedback themes/);
  assert.match(html, /E-Report issue types/);
  assert.match(html, /Farm-to-market road/);
  assert.match(html, /Daily activity graph/);
  assert.match(html, /Approximate network-region activity/);
  assert.match(html, /Counts represent actions, not people/);
  assert.match(html, /fewer than five actions are omitted/);
});

test("renders a report-level empty state instead of a zero-filled dashboard", () => {
  const emptyData: CitizenEngagementAnalytics = {
    ...data,
    overview: {
      searches: 0,
      projectViews: 0,
      mapViews: 0,
      ratingsSubmitted: 0,
      commentsSubmitted: 0,
      averageRating: null,
    },
    projectDiscovery: {
      mostViewed: [],
      mostOpenedFromSearch: [],
      mostOpenedFromMap: [],
      searchResultBands: [],
    },
    commonIssues: { feedbackThemes: [], eReportTypes: [] },
    networkGeography: { minimumEventCount: 5, regions: [] },
  };
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={emptyData} />);
  assert.match(html, /No citizen activity recorded/);
  assert.doesNotMatch(html, />0<\/p>/);
});

test("renders explicit empty states instead of blank rankings", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={data} />);
  assert.match(html, /No search-result opens recorded/);
  assert.match(html, /No map project opens recorded/);
});

test("shows recorded project selections even when all overview metrics are zero", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={{
    ...data,
    overview: { searches: 0, projectViews: 0, mapViews: 0, ratingsSubmitted: 0, commentsSubmitted: 0, averageRating: null },
    projectDiscovery: { mostViewed: [], mostOpenedFromSearch: [], mostOpenedFromMap: [{ projectId: "test-1", projectName: "Selected from map", count: 1 }], searchResultBands: [] },
    commonIssues: { feedbackThemes: [], eReportTypes: [] },
    networkGeography: { minimumEventCount: 5, regions: [] },
  }} />);
  assert.doesNotMatch(html, /No citizen activity recorded/);
  assert.match(html, /Selected from map/);
  assert.match(html, /Region tracking may be disabled or unavailable/);
  assert.match(html, /Each E-Report counts once for every selected issue type/);
});

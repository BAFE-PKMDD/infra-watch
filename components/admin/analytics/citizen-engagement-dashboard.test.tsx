import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CitizenEngagementDashboard } from "./citizen-engagement-dashboard";
import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";
import type { SurveyDemographics } from "@/lib/analytics/survey-demographics";

const noGroups = { rows: [], hasHiddenGroups: false };
const emptyDemographics: SurveyDemographics = {
  minimumGroupSize: 2,
  asked: 0,
  answered: 0,
  skipped: 0,
  responseRate: null,
  respondentTypes: noGroups,
  ageBands: noGroups,
  genders: noGroups,
  referralSources: noGroups,
  surveySources: noGroups,
};
const demographics: SurveyDemographics = {
  ...emptyDemographics,
  asked: 40,
  answered: 30,
  skipped: 10,
  responseRate: 75,
  respondentTypes: { rows: [{ key: "farmer", label: "Farmer", count: 18 }, { key: "student", label: "Student", count: 12 }], hasHiddenGroups: true },
  ageBands: { rows: [{ key: "25_34", label: "25–34", count: 14 }], hasHiddenGroups: false },
  genders: { rows: [{ key: "Female", label: "Female", count: 16 }], hasHiddenGroups: false },
  referralSources: { rows: [{ key: "facebook", label: "Facebook", count: 22 }], hasHiddenGroups: false },
  surveySources: { rows: [{ key: "feedback", label: "Feedback", count: 20 }], hasHiddenGroups: false },
};

const data: CitizenEngagementAnalytics = {
  range: { from: "2026-09-01", to: "2026-09-22", earliestAvailable: "2026-06-25", timeZone: "Asia/Manila", maximumDays: 90 },
  freshness: { generatedAt: "2026-09-22T10:00:00.000Z", eventRetentionDays: 90 },
  overview: {
    siteVisits: 21,
    searches: 12,
    projectViews: 34,
    mapViews: 8,
    ratingsSubmitted: 5,
    commentsSubmitted: 7,
    averageRating: 4.2,
  },
  trend: [{ date: "2026-09-22", visits: 4, searches: 2, projectViews: 3, mapViews: 1, ratingsSubmitted: 1, commentsSubmitted: 1 }],
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
  visitGeography: {
    minimumEventCount: 5,
    regions: [{ code: "PH130000000", count: 6 }],
  },
  demographics,
};

test("renders truthful metric labels, reporting context, and separate issue taxonomies", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={data} />);

  assert.match(html, /Completed searches/);
  assert.match(html, /Opened from search/);
  assert.doesNotMatch(html, /Most searched projects/);
  assert.match(html, /Asia\/Manila/);
  assert.match(html, /Site visits count browser sessions \(one per session, not per person\)/);
  assert.match(html, /90 days/);
  assert.match(html, /Feedback themes/);
  assert.match(html, /E-Report issue types/);
  assert.match(html, /Farm-to-market road/);
  assert.match(html, /Daily activity graph/);
  assert.match(html, /Approximate network-region activity/);
  assert.match(html, /Counts are actions, not people/);
  assert.match(html, /Regions under 5 actions are hidden/);
});

test("shows site visits as browser sessions with their own approximate-region section", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={data} />);
  assert.match(html, /Site visits/);
  assert.match(html, />21</);
  assert.match(html, /Browser sessions that loaded the public site/);
  assert.match(html, /Site visits by approximate region/);
  assert.match(html, /someone on several browsers counts more than once/);
  assert.match(html, /Regions under 5 visits are hidden/);
});

test("shows survey demographics with response coverage and small-group notice", () => {
  const html = renderToStaticMarkup(<CitizenEngagementDashboard data={data} />);
  assert.match(html, /Who is using InfraWatch/);
  assert.match(html, /Percentages are of people who answered, not of all visitors/);
  assert.match(html, /Asked/);
  assert.match(html, /Answered/);
  assert.match(html, />75%</);
  assert.match(html, /Respondent type/);
  assert.match(html, /Farmer/);
  assert.match(html, /Age range/);
  assert.match(html, /25–34/);
  assert.match(html, /Groups under 2 are not shown/);
});

test("explains an empty survey period and an all-skipped period", () => {
  const none = renderToStaticMarkup(<CitizenEngagementDashboard data={{ ...data, demographics: emptyDemographics }} />);
  assert.match(none, /No survey responses recorded for this period/);
  const skipped = renderToStaticMarkup(<CitizenEngagementDashboard data={{ ...data, demographics: { ...emptyDemographics, asked: 12, skipped: 12, responseRate: 0 } }} />);
  assert.match(skipped, /Everyone skipped the survey in this period/);
});

test("renders a report-level empty state instead of a zero-filled dashboard", () => {
  const emptyData: CitizenEngagementAnalytics = {
    ...data,
    overview: {
      siteVisits: 0,
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
    visitGeography: { minimumEventCount: 5, regions: [] },
    demographics: emptyDemographics,
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
    overview: { siteVisits: 0, searches: 0, projectViews: 0, mapViews: 0, ratingsSubmitted: 0, commentsSubmitted: 0, averageRating: null },
    projectDiscovery: { mostViewed: [], mostOpenedFromSearch: [], mostOpenedFromMap: [{ projectId: "test-1", projectName: "Selected from map", count: 1 }], searchResultBands: [] },
    commonIssues: { feedbackThemes: [], eReportTypes: [] },
    networkGeography: { minimumEventCount: 5, regions: [] },
    visitGeography: { minimumEventCount: 5, regions: [] },
    demographics: emptyDemographics,
  }} />);
  assert.doesNotMatch(html, /No citizen activity recorded/);
  assert.match(html, /Selected from map/);
  assert.match(html, /Region tracking may be disabled or unavailable/);
  assert.match(html, /Each E-Report counts once for every selected issue type/);
});

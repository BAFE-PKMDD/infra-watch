import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { aggregateInfraAnalyticsRows } from "@/actions/query/analytics.query";
import { LandingPageClient } from "./landing-page-client";

const analytics = aggregateInfraAnalyticsRows([
  {
    status: "ongoing",
    stage: "Implementation",
    region: "Region III",
    bannerProgram: "Rice Program",
    program: "AMEFIP",
    yearFunded: "2026",
    lastSyncedAt: new Date("2026-08-21T00:00:00.000Z"),
    budget: "1000000.00",
    latitude: 14.5995,
    longitude: 120.9842,
  },
]);

const html = renderToStaticMarkup(<LandingPageClient initialAnalytics={analytics} />);

test("keeps animated hero words intact at narrow widths", () => {
  const nonWrappingWordGroups = html.match(/class="inline-block whitespace-nowrap"/g) ?? [];
  assert.equal(nonWrappingWordGroups.length, 5);
  assert.match(html, /translateY\(20px\)[^>]*>L<\/span>/);
  assert.match(html, /translateY\(20px\)[^>]*>O<\/span><\/span><\/p>/);
});

test("uses readable stacked outcome cards on mobile and preserves the desktop comparison slider", () => {
  assert.match(html, /md:hidden[^>]*>[\s\S]*Illustrative Before[\s\S]*Illustrative After/);
  assert.match(html, /hidden[^\"]*md:block[^>]*>[\s\S]*type="range"/);
  assert.match(html, /aria-label="Compare illustrative before and after outcomes"/);
});

test("uses compact mobile spacing for the main landing sections", () => {
  assert.match(html, /py-16[^>]*md:py-28/);
  assert.match(html, /mb-10[^>]*md:mb-14/);
});

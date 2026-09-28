import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { aggregateInfraAnalyticsRows } from "@/actions/query/analytics.query";
import { LanguageProvider } from "@/providers/language-provider";
import { LandingPageClient } from "./landing-page-client";

// The landing page reads its copy through useTranslation(), so render inside the app's
// LanguageProvider (which needs an app router); the language defaults to English.
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;

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
    startDate: null,
    targetCompletionDate: null,
    actualCompletionDate: null,
  },
]);

const html = renderToStaticMarkup(
  <AppRouterContext.Provider value={router}>
    <LanguageProvider>
      <LandingPageClient initialAnalytics={analytics} />
    </LanguageProvider>
  </AppRouterContext.Provider>,
);

test("keeps animated hero words intact at narrow widths", () => {
  const nonWrappingWordGroups = html.match(/class="inline-block whitespace-nowrap"/g) ?? [];
  assert.equal(nonWrappingWordGroups.length, 2);
  assert.match(html, /translateY\(50px\)[^>]*>T<\/span>/);
  assert.match(html, /translateY\(50px\)[^>]*>L<\/span><\/span><\/h1>/);
});

test("uses compact mobile spacing for the main landing sections", () => {
  assert.match(html, /py-16[^>]*md:py-28/);
  assert.match(html, /mb-10[^>]*md:mb-14/);
});

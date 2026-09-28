import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { ReportingMethods } from "./reporting-methods";
import { LanguageProvider } from "@/providers/language-provider";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;

test("reporting methods preserve the online report and link to SMS instructions", () => {
  // Rendered inside the site's language provider (English until a visitor picks Tagalog).
  const html = renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <LanguageProvider>
        <ReportingMethods />
      </LanguageProvider>
    </AppRouterContext.Provider>,
  );

  assert.match(html, /How to report/);
  assert.match(html, /Submit an Online E-Report/);
  assert.match(html, /href="\/report-issue\/new"/);
  assert.match(html, /Send an SMS Grievance/);
  assert.match(html, /href="\/report-issue\/sms"/);
  assert.doesNotMatch(html, /Send now/);
});

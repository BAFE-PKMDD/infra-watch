import assert from "node:assert/strict";
import { test } from "bun:test";
import type { ContextType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { ReportDateFilter } from "./report-date-filter";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: null } as unknown as ContextType<typeof AppRouterContext>;
function render(query: string) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <SearchParamsContext.Provider value={new URLSearchParams(query)}>
        <ReportDateFilter />
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>,
  );
}

test("the displayed range matches a bookmarked URL and subsequent navigation", () => {
  const first = render("from=2026-09-01&to=2026-09-10");
  assert.match(first, /Sep 01, 2026/);
  assert.match(first, /Sep 10, 2026/);
  const next = render("from=2026-10-01&to=2026-10-05");
  assert.match(next, /Oct 01, 2026/);
  assert.match(next, /Oct 05, 2026/);
  assert.doesNotMatch(next, /Sep 01, 2026/);
});

test("legacy timestamps display the same Manila calendar dates", () => {
  const html = render("from=2026-09-30T16%3A00%3A00.000Z&to=2026-10-04T16%3A00%3A00.000Z");
  assert.match(html, /Oct 01, 2026/);
  assert.match(html, /Oct 05, 2026/);
  assert.match(html, /Inclusive calendar dates/);
  assert.match(html, /Asia\/Manila/);
});

test("an end-date-only URL uses the same default range as the query", () => {
  const html = render("to=2026-09-15");
  assert.match(html, /Aug 17, 2026/);
  assert.match(html, /Sep 15, 2026/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataFreshness } from "./data-freshness";

const baseline = {
  lastSuccessfulSyncAt: "2026-08-10T01:00:00.000Z",
  latestSyncStatus: "completed",
  isStale: false,
  staleAfterHours: 26,
};

test("renders fresh, stale, failed, and never-synced states truthfully", () => {
  const fresh = renderToStaticMarkup(createElement(DataFreshness, { freshness: baseline, asOf: "2026-08-25" }));
  const stale = renderToStaticMarkup(createElement(DataFreshness, { freshness: { ...baseline, isStale: true } }));
  const failed = renderToStaticMarkup(createElement(DataFreshness, { freshness: { ...baseline, latestSyncStatus: "failed" } }));
  const never = renderToStaticMarkup(createElement(DataFreshness, { freshness: { ...baseline, lastSuccessfulSyncAt: null } }));

  assert.match(fresh, /Fresh/);
  assert.match(fresh, /Data age: 14 days/);
  assert.match(stale, /Stale/);
  assert.match(failed, /Latest sync failed/);
  assert.match(failed, /Last successful sync/);
  assert.doesNotMatch(fresh, /Data as of/);
  assert.match(never, /Never synced/);
  assert.doesNotMatch(fresh, /Live/);
});

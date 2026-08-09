import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DashboardState } from "./dashboard-state";

test("renders accessible loading, error, empty, stale, and refresh-error states", () => {
  const loading = renderToStaticMarkup(createElement(DashboardState, { state: "loading" }));
  const error = renderToStaticMarkup(createElement(DashboardState, { state: "error" }));
  const empty = renderToStaticMarkup(createElement(DashboardState, { state: "empty" }));
  const stale = renderToStaticMarkup(createElement(DashboardState, { state: "stale" }));
  const refreshError = renderToStaticMarkup(createElement(DashboardState, { state: "refreshError" }));

  assert.match(loading, /Loading dashboard analytics/);
  assert.match(loading, /status/);
  assert.match(error, /Unable to load analytics/);
  assert.match(error, /role="alert"/);
  assert.match(empty, /No projects match/);
  assert.match(stale, /may be stale/);
  assert.match(refreshError, /last successfully loaded/i);
});

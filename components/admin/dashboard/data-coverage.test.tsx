import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataCoverage } from "./data-coverage";

test("shows assessed denominators and distinguishes unavailable financial data", () => {
  const html = renderToStaticMarkup(
    createElement(DataCoverage, {
      coverage: {
        total: 10,
        withBudget: 8,
        withSchedule: 7,
        withPhysicalProgress: 6,
        withFinancialData: 0,
      },
    }),
  );
  assert.match(html, /8 of 10/);
  assert.match(html, /7 of 10/);
  assert.match(html, /6 of 10/);
  assert.match(html, /Financial data unavailable/);
});

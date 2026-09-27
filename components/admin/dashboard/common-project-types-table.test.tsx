import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CommonProjectTypesTable } from "./common-project-types-table";

const data = [
  {
    projectType: "Greenhouse",
    category: "Production Facility",
    total: 2618,
    allocatedBudget: 30_792_501,
    medianBudget: 12_000,
    p25Budget: 10_000,
    p75Budget: 12_000,
  },
  {
    projectType: "Legacy Shed",
    category: null,
    total: 5,
    allocatedBudget: 0,
    medianBudget: null,
    p25Budget: null,
    p75Budget: null,
  },
];

test("ranks project types with typical cost and usual price range", () => {
  const html = renderToStaticMarkup(createElement(CommonProjectTypesTable, { data }));

  assert.match(html, /What are the most common project types\?/);
  assert.match(html, /Greenhouse/);
  assert.match(html, /Production Facility/);
  assert.match(html, /2,618/);
  assert.match(html, /Unclassified/);
});

test("shows Unavailable for types with no usable budget instead of a dash or zero", () => {
  const html = renderToStaticMarkup(createElement(CommonProjectTypesTable, { data }));

  assert.match(html, /Legacy Shed/);
  const legacyRowIndex = html.indexOf("Legacy Shed");
  const legacyRow = html.slice(legacyRowIndex, legacyRowIndex + 2000);
  assert.match(legacyRow, /Unavailable/);
});

test("shows an explicit unavailable state when the backend has not returned this breakdown", () => {
  const html = renderToStaticMarkup(createElement(CommonProjectTypesTable, { data: undefined }));

  assert.match(html, /Common project types are unavailable/);
});

test("shows the empty state with no project types", () => {
  const html = renderToStaticMarkup(createElement(CommonProjectTypesTable, { data: [] }));
  assert.match(html, /No data available/);
});

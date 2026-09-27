import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ProgressCurveChart } from "./progress-curve-chart";

function renderWithQueryClient(element: ReactElement) {
  const client = new QueryClient();
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, element));
}

test("prompts for a project before any project is chosen", () => {
  const html = renderWithQueryClient(createElement(ProgressCurveChart, {
    progressVariance: [
      { projectId: "p1", projectName: "Establishment of Nursery", expectedProgress: 72.5, physicalProgress: 61, variance: -11.5, health: "atRisk" },
    ],
    viewerKey: "u1",
  }));
  assert.match(html, /Planned vs actual progress/);
  assert.match(html, /Choose a project/);
  assert.match(html, /Establishment of Nursery/);
  assert.match(html, /11 points behind/);
});

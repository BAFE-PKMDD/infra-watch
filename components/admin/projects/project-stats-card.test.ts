import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectStatsCard } from "./project-stats-card";

test("displays every project status category returned by the statistics API", () => {
  const html = renderToStaticMarkup(
    createElement(ProjectStatsCard, {
      statistics: {
        total: 31,
        totalBudget: 1_000_000,
        planned: 11,
        ongoing: 7,
        completed: 12,
        suspended: 1,
      },
    }),
  );

  assert.match(html, /Not Yet Started/);
  assert.match(html, />11</);
});

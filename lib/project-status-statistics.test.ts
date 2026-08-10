import assert from "node:assert/strict";
import test from "node:test";

import { aggregateProjectStatusCounts } from "./project-status-statistics";

test("assigns every project status to exactly one dashboard category", () => {
  const counts = aggregateProjectStatusCounts([
    { status: "completed", count: 10 },
    { status: "Inventory", count: 2 },
    { status: "ongoing", count: 4 },
    { status: "Implementation", count: 3 },
    { status: "suspended", count: 1 },
    { status: "For Review", count: 5 },
    { status: "For Validation", count: 6 },
  ]);

  assert.deepEqual(counts, {
    total: 31,
    planned: 11,
    ongoing: 7,
    completed: 12,
    suspended: 1,
  });
  assert.equal(
    counts.planned + counts.ongoing + counts.completed + counts.suspended,
    counts.total,
  );
});

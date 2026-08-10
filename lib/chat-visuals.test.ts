import assert from "node:assert/strict";
import test from "node:test";

import { parseChartSpec } from "./chat-visuals";

test("parses a valid aggregate chart specification", () => {
  assert.deepEqual(
    parseChartSpec(
      JSON.stringify({
        type: "bar",
        title: "Projects by status",
        valueLabel: "Projects",
        data: [
          { label: "Completed", value: 120 },
          { label: "Ongoing", value: 45 },
        ],
      }),
    ),
    {
      type: "bar",
      title: "Projects by status",
      valueLabel: "Projects",
      data: [
        { label: "Completed", value: 120 },
        { label: "Ongoing", value: 45 },
      ],
    },
  );
});

test("accepts pie charts and optional currency prefixes", () => {
  const chart = parseChartSpec(
    JSON.stringify({
      type: "pie",
      title: "Budget by province",
      valueLabel: "Budget",
      valuePrefix: "₱",
      data: [{ label: "Aklan", value: 15000000 }],
    }),
  );

  assert.equal(chart?.type, "pie");
  assert.equal(chart?.valuePrefix, "₱");
});

test("rejects malformed, empty, or oversized chart data", () => {
  assert.equal(parseChartSpec("not json"), null);
  assert.equal(
    parseChartSpec(JSON.stringify({ type: "bar", title: "Empty", data: [] })),
    null,
  );
  assert.equal(
    parseChartSpec(
      JSON.stringify({
        type: "bar",
        title: "Too many",
        data: Array.from({ length: 13 }, (_, index) => ({
          label: `Item ${index}`,
          value: index,
        })),
      }),
    ),
    null,
  );
});

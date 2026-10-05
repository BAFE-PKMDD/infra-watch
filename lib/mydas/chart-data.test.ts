import assert from "node:assert/strict";
import { test } from "bun:test";

import { checkChartShape, normalizeMydasChart, normalizeMydasPages, projectTrend } from "./chart-data";

test("projects a straight-line trend three periods past a year series", () => {
  const result = projectTrend({
    title: "Projects started",
    seriesNames: ["Projects"],
    data: [
      { label: "2021", values: [10] },
      { label: "2022", values: [20] },
      { label: "2023", values: [30] },
      { label: "2024", values: [40] },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const projected = result.chart.data.filter((row) => row.projected);
  assert.deepEqual(projected.map((row) => row.label), ["2025", "2026", "2027"]);
  assert.deepEqual(projected.map((row) => row.values[0]), [50, 60, 70]);
  assert.equal(result.chart.data.filter((row) => !row.projected).length, 4);
});

test("rejects a trend with fewer than three periods", () => {
  const result = projectTrend({
    title: "Short",
    seriesNames: ["Count"],
    data: [{ label: "2024", values: [5] }],
  });
  assert.equal(result.ok, false);
});

test("never projects below zero for a falling series", () => {
  const result = projectTrend({
    title: "Falling",
    seriesNames: ["Count"],
    data: [
      { label: "A", values: [9] },
      { label: "B", values: [4] },
      { label: "C", values: [1] },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.chart.data.filter((row) => row.projected).every((row) => row.values[0] >= 0));
});

test("upgrades a legacy single-value chart to the multi-series shape", () => {
  const legacy = {
    type: "bar",
    title: "Top provinces",
    valueLabel: "Projects",
    data: [
      { label: "Benguet", value: 1437 },
      { label: "Ilocos Norte", value: 300 },
    ],
  };

  assert.deepEqual(normalizeMydasChart(legacy, "Fallback"), {
    title: "Top provinces",
    seriesNames: ["Projects"],
    data: [
      { label: "Benguet", values: [1437] },
      { label: "Ilocos Norte", values: [300] },
    ],
  });
});

test("keeps a current multi-series chart unchanged", () => {
  const current = {
    title: "Status mix",
    seriesNames: ["Completed", "Ongoing"],
    data: [{ label: "Region I", values: [4, 2] }],
  };

  assert.deepEqual(normalizeMydasChart(current, "Fallback"), current);
});

test("falls back to a title and empty rows for malformed saved chart data", () => {
  assert.deepEqual(normalizeMydasChart(null, "Untitled chart"), {
    title: "Untitled chart",
    seriesNames: ["Untitled chart"],
    data: [],
  });
});

test("upgrades legacy chart elements inside saved pages and defaults unknown chart types", () => {
  const pages = normalizeMydasPages([
    {
      id: "page-1",
      elements: [
        {
          id: "chart-1",
          kind: "chart",
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          displayType: "treemap",
          showLegend: false,
          valueLabelPosition: "none",
          palette: "default",
          sql: "SELECT 1",
          chart: { type: "bar", title: "Old", data: [{ label: "A", value: 2 }] },
        },
        { id: "label-1", kind: "label", x: 0, y: 0, width: 100, height: 40, text: "Note", fontSize: 14 },
      ],
    },
  ] as never);

  const [chart, label] = pages[0].elements;
  assert.equal(chart.kind === "chart" && chart.displayType, "bar");
  assert.equal(chart.kind === "chart" && chart.chart.data[0].values[0], 2);
  assert.equal(label.kind, "label");
});

test("requires exactly three value columns for a range chart", () => {
  assert.notEqual(checkChartShape("range", 2), null);
  assert.equal(checkChartShape("range", 3), null);
  assert.equal(checkChartShape("bar", 1), null);
});

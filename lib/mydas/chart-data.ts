import {
  MYDAS_DISPLAY_TYPES,
  type MydasCanvasElement,
  type MydasChartData,
  type MydasChartRow,
  type MydasDisplayType,
  type MydasPageData,
} from "@/types/mydas.types";

export const MAX_CHART_ROWS = 12;
export const MAX_VALUE_FIELDS = 8;
export const TREND_PROJECTION_STEPS = 3;
const TREND_MIN_HISTORY = 3;

// Dashboards saved before multi-series charts stored one `value` per row. Upgrade them
// on load so the renderer only ever sees the current shape.
export function normalizeMydasChart(raw: unknown, fallbackTitle: string): MydasChartData {
  const record = (raw ?? {}) as Record<string, unknown>;
  const title = typeof record.title === "string" && record.title ? record.title : fallbackTitle;
  const rows = Array.isArray(record.data) ? (record.data as Record<string, unknown>[]) : [];

  if (Array.isArray(record.seriesNames)) {
    return {
      title,
      seriesNames: (record.seriesNames as unknown[]).map(String),
      data: rows.map((row) => ({
        label: String(row.label ?? ""),
        values: Array.isArray(row.values) ? (row.values as unknown[]).map(Number) : [],
        ...(row.projected === true ? { projected: true } : {}),
      })),
    };
  }

  const seriesName = typeof record.valueLabel === "string" && record.valueLabel ? record.valueLabel : title;
  return {
    title,
    seriesNames: [seriesName],
    data: rows.map((row) => ({ label: String(row.label ?? ""), values: [Number(row.value ?? 0)] })),
  };
}

export function normalizeMydasPages(pages: MydasPageData[]): MydasPageData[] {
  return pages.map((page) => ({
    ...page,
    elements: page.elements.map((element): MydasCanvasElement => {
      if (element.kind !== "chart") return element;
      const displayType = (MYDAS_DISPLAY_TYPES as readonly string[]).includes(element.displayType)
        ? element.displayType
        : ("bar" as MydasDisplayType);
      return {
        ...element,
        displayType,
        chart: normalizeMydasChart(element.chart, "Untitled chart"),
      };
    }),
  }));
}

// Returns a user-facing error when the query's columns can't form the requested chart,
// or null when the shape is fine.
export function checkChartShape(displayType: MydasDisplayType, valueFieldCount: number): string | null {
  if (displayType === "range" && valueFieldCount !== 3) {
    return "A range chart needs exactly three value columns, in this order: minimum, median, maximum.";
  }
  if (displayType === "trend" && valueFieldCount !== 1) {
    return "A trend chart needs exactly one value column, ordered by time.";
  }
  return null;
}

// Fits a least-squares straight line to the history and extends it. Deliberately
// simple: it's a linear extrapolation of past values, not a statistical forecast.
export function projectTrend(
  chart: MydasChartData,
): { ok: true; chart: MydasChartData } | { ok: false; reason: string } {
  const history = chart.data
    .slice(-(MAX_CHART_ROWS - TREND_PROJECTION_STEPS))
    .map((row) => ({ label: row.label, values: [row.values[0] ?? 0] }));

  if (history.length < TREND_MIN_HISTORY) {
    return { ok: false, reason: "A trend needs at least three time periods of data to project from." };
  }

  const n = history.length;
  const ys = history.map((row) => row.values[0]);
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((sum, y) => sum + y, 0) / n;
  let numerator = 0;
  let denominator = 0;
  ys.forEach((y, i) => {
    numerator += (i - xMean) * (y - yMean);
    denominator += (i - xMean) ** 2;
  });
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  const yearLabels = history.every((row) => /^\d{4}$/.test(row.label));
  const lastYear = yearLabels ? Number(history[n - 1].label) : 0;
  const projected: MydasChartRow[] = Array.from({ length: TREND_PROJECTION_STEPS }, (_, k) => {
    const step = k + 1;
    const value = Math.max(0, Math.round(intercept + slope * (n - 1 + step)));
    return {
      label: yearLabels ? String(lastYear + step) : `+${step}`,
      values: [value],
      projected: true,
    };
  });

  return {
    ok: true,
    chart: { ...chart, seriesNames: [chart.seriesNames[0] ?? "Value"], data: [...history, ...projected] },
  };
}

export function rowsToChartData(
  title: string,
  seriesNames: string[],
  rows: Record<string, unknown>[],
  labelField: string,
  valueFields: string[],
): MydasChartData {
  const data: MydasChartRow[] = rows.slice(0, MAX_CHART_ROWS).map((row) => ({
    label: String(row[labelField] ?? "Unknown").slice(0, 48),
    values: valueFields.map((field) => {
      const raw = row[field];
      const value = typeof raw === "number" ? raw : Number(raw ?? 0);
      return Number.isFinite(value) ? value : 0;
    }),
  }));
  return { title, seriesNames, data };
}

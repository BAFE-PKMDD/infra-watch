export const MYDAS_DISPLAY_TYPES = [
  "bar",
  "column",
  "line",
  "area",
  "pie",
  "donut",
  "stacked-bar-100",
  "stacked-column",
  "heatmap",
  "range",
  "kpi",
  "trend",
] as const;

export type MydasDisplayType = (typeof MYDAS_DISPLAY_TYPES)[number];
export type ValueLabelPosition = "none" | "inside" | "outside";
export type MydasPalette = "default" | "ocean" | "sunset" | "earth";

export interface MydasChartRow {
  label: string;
  values: number[];
  projected?: boolean;
}

export interface MydasChartData {
  title: string;
  seriesNames: string[];
  data: MydasChartRow[];
}

export interface MydasBaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MydasChartElement extends MydasBaseElement {
  kind: "chart";
  chart: MydasChartData;
  displayType: MydasDisplayType;
  showLegend: boolean;
  valueLabelPosition: ValueLabelPosition;
  palette: MydasPalette;
  sql: string;
}

export interface MydasLabelElement extends MydasBaseElement {
  kind: "label";
  text: string;
  fontSize: number;
}

export type MydasCanvasElement = MydasChartElement | MydasLabelElement;

export interface MydasPageData {
  id: string;
  elements: MydasCanvasElement[];
}

export interface MydasDashboardSummary {
  id: string;
  name: string;
  updatedAt: Date;
}

import type { ChartSpec } from "@/lib/chat-visuals";

export type MydasDisplayType = "bar" | "column" | "line" | "area" | "pie" | "donut";
export type ValueLabelPosition = "none" | "inside" | "outside";
export type MydasPalette = "default" | "ocean" | "sunset" | "earth";

export interface MydasBaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MydasChartElement extends MydasBaseElement {
  kind: "chart";
  chart: ChartSpec;
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

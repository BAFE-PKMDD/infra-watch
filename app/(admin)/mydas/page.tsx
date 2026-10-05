"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  FileDown,
  Lock,
  Send,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Pencil,
  X,
  ListTree,
  Plus,
  Trash2,
  Maximize2,
  Expand,
  Type as TypeIcon,
  Minus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";
import { askMydas } from "@/actions/mutation/mydas.mutation";
import type { MydasReply } from "@/lib/mydas/generate-widget";
import { capturePageAsPng, downloadDashboardAsPdf } from "@/lib/mydas/dashboard-export";
import { listMydasDashboards, getMydasDashboard } from "@/actions/query/mydas-dashboard.query";
import {
  createMydasDashboard,
  saveMydasDashboard,
  renameMydasDashboard,
  deleteMydasDashboard,
} from "@/actions/mutation/mydas-dashboard.mutation";
import type { ChartSpec } from "@/lib/chat-visuals";
import type {
  MydasDisplayType,
  ValueLabelPosition,
  MydasPalette,
  MydasChartElement as ChartElement,
  MydasLabelElement as LabelElement,
  MydasCanvasElement as CanvasElement,
  MydasPageData,
  MydasDashboardSummary,
} from "@/types/mydas.types";

// A4 at 96 CSS px/inch (210mm x 297mm) — the designer canvas is sized to this so
// what you lay out on screen matches an A4 page when exported later.
const A4_CANVAS_WIDTH = 794;
const A4_CANVAS_HEIGHT = 1123;

const CHART_MIN_WIDTH = 220;
const CHART_MIN_HEIGHT = 170;
const CHART_DEFAULT_WIDTH = 340;
const CHART_DEFAULT_HEIGHT = 260;
const LABEL_MIN_WIDTH = 100;
const LABEL_MIN_HEIGHT = 40;

// "default" mirrors components/ai-message-content.tsx's CHART_COLORS so MYDAS
// charts match the rest of the app's AI-generated charts by default.
const PALETTES: Record<MydasPalette, string[]> = {
  default: ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#4f46e5", "#65a30d", "#db2777", "#0f766e", "#9333ea"],
  ocean: ["#0369a1", "#0891b2", "#0d9488", "#2563eb", "#164e63", "#06b6d4", "#1e40af", "#155e75", "#38bdf8", "#0f766e", "#1d4ed8", "#67e8f9"],
  sunset: ["#ea580c", "#dc2626", "#db2777", "#f59e0b", "#be185d", "#c2410c", "#e11d48", "#f97316", "#9f1239", "#fb923c", "#be123c", "#fbbf24"],
  earth: ["#4d7c0f", "#78350f", "#65a30d", "#a16207", "#365314", "#92400e", "#166534", "#b45309", "#3f6212", "#854d0e", "#14532d", "#d97706"],
};

const PALETTE_LABELS: Record<MydasPalette, string> = {
  default: "Default",
  ocean: "Ocean",
  sunset: "Sunset",
  earth: "Earth",
};

function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-PH", {
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

const DISPLAY_TYPE_LABELS: Record<MydasDisplayType, string> = {
  bar: "Horizontal bars",
  column: "Vertical columns",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
};

const TOOLTIP_STYLE = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 };
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };
const CATEGORY_AXIS_TICK = { fontSize: 10, fill: "#475569" };
const LEGEND_STYLE = { fontSize: 11 };
const CHART_MARGIN = { top: 4, right: 12, bottom: 4, left: 0 };
const COLUMN_CHART_MARGIN = { top: 4, right: 12, bottom: 24, left: 0 };
// Stable references (not recreated every render) so a widget resize doesn't churn
// Recharts' internal tick memoization -- see the DraggableBox rAF-coalescing comment.
const formatAxisTick = (value: number | string) => formatChartValue(Number(value));
const valueLabelFormatter = (value: string | number | boolean | null | undefined) => formatChartValue(Number(value ?? 0));

// Fills 100% of its parent (rather than sizing itself off data length), so a
// widget's own resize handle actually changes the rendered chart size.
function MydasChart({
  data,
  type,
  seriesName,
  showLegend,
  valueLabelPosition,
  colors,
}: {
  data: ChartSpec["data"];
  type: MydasDisplayType;
  seriesName: string;
  showLegend: boolean;
  valueLabelPosition: ValueLabelPosition;
  colors: string[];
}) {
  const tooltipFormatter = useCallback(
    (value: number | string | readonly (number | string)[] | undefined): [string, string] => {
      const numericValue = typeof value === "number" || typeof value === "string" ? value : value?.[0];
      return [formatChartValue(Number(numericValue ?? 0)), seriesName];
    },
    [seriesName],
  );

  if (type === "pie" || type === "donut") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={type === "donut" ? "55%" : "35%"}
            outerRadius="75%"
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell key={`${item.label}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Line type="monotone" dataKey="value" name={seriesName} stroke={colors[0]} strokeWidth={2} dot={{ r: 3, fill: colors[0] }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Area type="monotone" dataKey="value" name={seriesName} stroke={colors[0]} fill={colors[0]} fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "column") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={COLUMN_CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={CATEGORY_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Bar dataKey="value" name={seriesName} radius={[5, 5, 0, 0]}>
            {data.map((item, index) => (
              <Cell key={`${item.label}-${index}`} fill={colors[index % colors.length]} />
            ))}
            {valueLabelPosition !== "none" && (
              <LabelList
                dataKey="value"
                position={valueLabelPosition === "inside" ? "inside" : "top"}
                formatter={valueLabelFormatter}
                style={{ fontSize: 10, fill: valueLabelPosition === "inside" ? "#ffffff" : "#475569" }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // default: "bar" (horizontal)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickFormatter={formatAxisTick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis type="category" dataKey="label" width={88} tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip formatter={tooltipFormatter} contentStyle={TOOLTIP_STYLE} />
        {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
        <Bar dataKey="value" name={seriesName} radius={[0, 5, 5, 0]}>
          {data.map((item, index) => (
            <Cell key={`${item.label}-${index}`} fill={colors[index % colors.length]} />
          ))}
          {valueLabelPosition !== "none" && (
            <LabelList
              dataKey="value"
              position={valueLabelPosition === "inside" ? "insideRight" : "right"}
              formatter={valueLabelFormatter}
              style={{ fontSize: 10, fill: valueLabelPosition === "inside" ? "#ffffff" : "#475569" }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type MydasMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};


const SUGGESTIONS = [
  "Which regions have the most delayed projects?",
  "Show the top 10 municipalities by approved budget.",
  "Compare AMEFIP vs INS completion rates by year.",
];

const DISCLAIMER = "AI-generated analysis. Verify against the source data before making official decisions.";

function RestrictedNotice() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
      <Lock aria-hidden="true" className="size-8 text-slate-400" />
      <p className="text-base font-semibold text-slate-900 dark:text-white">Administrator access only</p>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        MYDAS generates and runs data queries against the project read model, so it is limited to the admin role.
      </p>
    </div>
  );
}

// Generic drag (by header) + resize (bottom-right handle) wrapper shared by both
// chart and label elements on the canvas. Uses pointer capture + per-move deltas
// (not absolute cursor position) and commits through a functional updater so
// rapid pointer events never read stale element state.
// Header sits inline (consuming part of the box's own height) for charts, where
// there's no separate "final" appearance to match. Labels toggle between an edited
// box and a plain-text final view at the identical (x, y, width, height) -- an inline
// header there would push the text down while editing, so it visibly jumps up the
// moment you click away. "overlay" floats the header above the box instead, keeping
// the editable area's geometry pixel-identical to the deselected label.
const OVERLAY_HEADER_HEIGHT = 36;

function DraggableBox({
  x,
  y,
  width,
  height,
  minWidth,
  minHeight,
  onMoveBy,
  onResizeBy,
  header,
  onRemove,
  removeLabel,
  children,
  headerPlacement = "inline",
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  onMoveBy: (dx: number, dy: number) => void;
  onResizeBy: (dx: number, dy: number) => void;
  header: ReactNode;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
  headerPlacement?: "inline" | "overlay";
}) {
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number } | null>(null);

  // Pointermove fires far faster than React (and Recharts' internal tick
  // measurement) can keep up with -- committing a setState per raw event
  // during a fast drag trips React's nested-update guard ("Maximum update
  // depth exceeded", surfacing from Recharts' RenderedTicksReporter inside
  // any chart on the canvas). Accumulate deltas and flush at most once per
  // animation frame instead.
  const pendingMove = useRef<{ dx: number; dy: number } | null>(null);
  const moveRafId = useRef<number | null>(null);
  const pendingResize = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRafId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (moveRafId.current != null) cancelAnimationFrame(moveRafId.current);
      if (resizeRafId.current != null) cancelAnimationFrame(resizeRafId.current);
    };
  }, []);

  function flushMove() {
    moveRafId.current = null;
    const pending = pendingMove.current;
    if (!pending) return;
    pendingMove.current = null;
    onMoveBy(pending.dx, pending.dy);
  }
  function flushResize() {
    resizeRafId.current = null;
    const pending = pendingResize.current;
    if (!pending) return;
    pendingResize.current = null;
    onResizeBy(pending.dx, pending.dy);
  }

  function startDrag(event: React.PointerEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
  }
  function onDragMove(event: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    dragStart.current = { x: event.clientX, y: event.clientY };
    pendingMove.current = { dx: (pendingMove.current?.dx ?? 0) + dx, dy: (pendingMove.current?.dy ?? 0) + dy };
    if (moveRafId.current == null) moveRafId.current = requestAnimationFrame(flushMove);
  }
  function endDrag() {
    dragStart.current = null;
    if (moveRafId.current != null) {
      cancelAnimationFrame(moveRafId.current);
      flushMove();
    }
  }

  function startResize(event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    resizeStart.current = { x: event.clientX, y: event.clientY };
  }
  function onResizeMove(event: React.PointerEvent) {
    if (!resizeStart.current) return;
    const dx = event.clientX - resizeStart.current.x;
    const dy = event.clientY - resizeStart.current.y;
    resizeStart.current = { x: event.clientX, y: event.clientY };
    pendingResize.current = { dx: (pendingResize.current?.dx ?? 0) + dx, dy: (pendingResize.current?.dy ?? 0) + dy };
    if (resizeRafId.current == null) resizeRafId.current = requestAnimationFrame(flushResize);
  }
  function endResize() {
    resizeStart.current = null;
    if (resizeRafId.current != null) {
      cancelAnimationFrame(resizeRafId.current);
      flushResize();
    }
  }

  void minWidth;
  void minHeight;

  const headerBar = (
    <div
      data-capture-box="true"
      onPointerDown={startDrag}
      onPointerMove={onDragMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="flex min-h-9 shrink-0 cursor-move items-center gap-1 border-b border-slate-100 bg-slate-50 px-1.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/60"
    >
      {header}
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={removeLabel}
        data-capture-hide="true"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );

  const resizeHandle = (
    <div
      onPointerDown={startResize}
      onPointerMove={onResizeMove}
      onPointerUp={endResize}
      onPointerCancel={endResize}
      title="Drag to resize"
      data-capture-hide="true"
      className="absolute bottom-0 right-0 size-4 cursor-nwse-resize"
      style={{ background: "linear-gradient(135deg, transparent 50%, #94a3b8 50%)" }}
    />
  );

  if (headerPlacement === "overlay") {
    return (
      <>
        <div
          data-capture-hide="true"
          className="absolute overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{ left: x, top: y - OVERLAY_HEADER_HEIGHT, width }}
        >
          {headerBar}
        </div>
        <div
          data-capture-box="true"
          className="absolute overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{ left: x, top: y, width, height }}
        >
          {children}
          {resizeHandle}
        </div>
      </>
    );
  }

  return (
    <div
      data-capture-box="true"
      className="absolute flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
      style={{ left: x, top: y, width, height }}
    >
      {headerBar}
      <div className="min-h-0 flex-1">{children}</div>
      {resizeHandle}
    </div>
  );
}

function WidgetDataEditor({
  chart,
  onUpdateChart,
}: {
  chart: ChartSpec;
  onUpdateChart: (patch: Partial<ChartSpec>) => void;
}) {
  function updateRow(index: number, patch: Partial<ChartSpec["data"][number]>) {
    onUpdateChart({ data: chart.data.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  }
  function removeRow(index: number) {
    if (chart.data.length <= 1) return;
    onUpdateChart({ data: chart.data.filter((_, i) => i !== index) });
  }
  function addRow() {
    if (chart.data.length >= 12) return;
    onUpdateChart({ data: [...chart.data, { label: "New item", value: 0 }] });
  }

  return (
    <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
      {chart.data.map((row, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={row.label}
            onChange={(event) => updateRow(index, { label: event.target.value.slice(0, 48) })}
            aria-label={`Label for row ${index + 1}`}
            className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            type="number"
            min={0}
            value={row.value}
            onChange={(event) => updateRow(index, { value: Math.max(0, Number(event.target.value) || 0) })}
            aria-label={`Value for row ${index + 1}`}
            className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            disabled={chart.data.length <= 1}
            aria-label={`Remove row ${index + 1}`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={chart.data.length >= 12}
        className="flex min-h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
      >
        <Plus aria-hidden="true" className="size-3.5" /> Add row {chart.data.length >= 12 && "(max 12)"}
      </button>
    </div>
  );
}

function DesignerChart({
  element,
  onRemove,
  onMoveBy,
  onResizeBy,
  onUpdateChart,
}: {
  element: ChartElement;
  onRemove: () => void;
  onMoveBy: (dx: number, dy: number) => void;
  onResizeBy: (dx: number, dy: number) => void;
  onUpdateChart: (patch: Partial<ChartElement>) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(element.chart.title);
  const [showDataEditor, setShowDataEditor] = useState(false);

  function commitTitle() {
    const trimmed = draftTitle.trim();
    if (trimmed) onUpdateChart({ chart: { ...element.chart, title: trimmed } });
    else setDraftTitle(element.chart.title);
    setIsEditingTitle(false);
  }

  return (
    <DraggableBox
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      minWidth={CHART_MIN_WIDTH}
      minHeight={CHART_MIN_HEIGHT}
      onMoveBy={onMoveBy}
      onResizeBy={onResizeBy}
      onRemove={onRemove}
      removeLabel={`Remove "${element.chart.title}"`}
      header={
        <>
          {isEditingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={commitTitle}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitTitle();
                if (event.key === "Escape") {
                  setDraftTitle(element.chart.title);
                  setIsEditingTitle(false);
                }
              }}
              aria-label="Chart title"
              className="min-w-0 flex-1 rounded border border-primary/40 bg-white px-2 py-1 text-sm font-semibold outline-none dark:bg-slate-950"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              onPointerDown={(event) => event.stopPropagation()}
              className="group flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800"
              title="Click to rename"
            >
              <span className="truncate">{element.chart.title}</span>
              <Pencil aria-hidden="true" className="size-3 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100" />
            </button>
          )}
          <select
            value={element.displayType}
            onChange={(event) => onUpdateChart({ displayType: event.target.value as MydasDisplayType })}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Chart type"
            data-capture-hide="true"
            className="min-h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {(Object.keys(DISPLAY_TYPE_LABELS) as MydasDisplayType[]).map((option) => (
              <option key={option} value={option}>
                {DISPLAY_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 p-1.5">
          <MydasChart
            data={element.chart.data}
            type={element.displayType}
            seriesName={element.chart.valueLabel ?? element.chart.title}
            showLegend={element.showLegend}
            valueLabelPosition={element.valueLabelPosition}
            colors={PALETTES[element.palette]}
          />
        </div>
        <div data-capture-hide="true" className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 px-2 py-1 dark:border-slate-800">
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Palette
            <select
              value={element.palette}
              onChange={(event) => onUpdateChart({ palette: event.target.value as MydasPalette })}
              className="min-h-6 rounded border border-slate-200 bg-white px-1 text-[10px] dark:border-slate-700 dark:bg-slate-900"
            >
              {(Object.keys(PALETTE_LABELS) as MydasPalette[]).map((option) => (
                <option key={option} value={option}>
                  {PALETTE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={element.showLegend}
              onChange={(event) => onUpdateChart({ showLegend: event.target.checked })}
              className="size-3 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700"
            />
            Legend
          </label>
          {(element.displayType === "bar" || element.displayType === "column") && (
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Values
              <select
                value={element.valueLabelPosition}
                onChange={(event) => onUpdateChart({ valueLabelPosition: event.target.value as ValueLabelPosition })}
                className="min-h-6 rounded border border-slate-200 bg-white px-1 text-[10px] dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="none">Hidden</option>
                <option value="inside">Inside bar</option>
                <option value="outside">Outside bar</option>
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => setShowDataEditor((prev) => !prev)}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ListTree aria-hidden="true" className="size-3" /> {showDataEditor ? "Hide data" : "Edit data"}
          </button>
        </div>
        {showDataEditor && (
          <div data-capture-hide="true" className="max-h-32 shrink-0 overflow-y-auto">
            <WidgetDataEditor chart={element.chart} onUpdateChart={(patch) => onUpdateChart({ chart: { ...element.chart, ...patch } })} />
          </div>
        )}
      </div>
    </DraggableBox>
  );
}

function DesignerLabel({
  element,
  isSelected,
  onSelect,
  onRemove,
  onMoveBy,
  onResizeBy,
  onUpdateLabel,
}: {
  element: LabelElement;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveBy: (dx: number, dy: number) => void;
  onResizeBy: (dx: number, dy: number) => void;
  onUpdateLabel: (patch: Partial<LabelElement>) => void;
}) {
  // Deselected: render as plain text with no box/handles, so it reads as an
  // actual label on the page — click it to bring back the editing chrome.
  if (!isSelected) {
    return (
      <div
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect();
        }}
        title="Click to edit"
        className="absolute cursor-text overflow-hidden whitespace-pre-wrap break-words p-2 font-semibold text-slate-900 outline-dashed outline-1 outline-transparent hover:outline-slate-300 dark:text-white dark:hover:outline-slate-600"
        style={{ left: element.x, top: element.y, width: element.width, height: element.height, fontSize: element.fontSize }}
      >
        {element.text || <span className="text-slate-300 dark:text-slate-600">Empty label</span>}
      </div>
    );
  }

  return (
    <DraggableBox
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      minWidth={LABEL_MIN_WIDTH}
      minHeight={LABEL_MIN_HEIGHT}
      onMoveBy={onMoveBy}
      onResizeBy={onResizeBy}
      onRemove={onRemove}
      removeLabel="Remove label"
      headerPlacement="overlay"
      header={
        <div data-capture-hide="true" className="flex flex-1 items-center gap-1">
          <span className="flex min-h-8 flex-1 items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <TypeIcon aria-hidden="true" className="size-3.5" /> Label
          </span>
          <button
            type="button"
            onClick={() => onUpdateLabel({ fontSize: Math.max(10, element.fontSize - 2) })}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Decrease font size"
            className="inline-flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Minus aria-hidden="true" className="size-3.5" />
          </button>
          <span className="w-6 shrink-0 text-center text-[11px] text-slate-500 dark:text-slate-400">{element.fontSize}</span>
          <button
            type="button"
            onClick={() => onUpdateLabel({ fontSize: Math.min(72, element.fontSize + 2) })}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Increase font size"
            className="inline-flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      }
    >
      <textarea
        value={element.text}
        onChange={(event) => onUpdateLabel({ text: event.target.value.slice(0, 300) })}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Label text"
        placeholder="Type a label…"
        style={{ fontSize: element.fontSize }}
        className="h-full w-full resize-none border-0 p-2 font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-white"
      />
    </DraggableBox>
  );
}

// Full-viewport A4 design canvas. Built as a plain fixed overlay rather than the
// real Fullscreen API — more reliable across browsers/embedded contexts, and all
// we actually need is "take over the screen", not true OS-level fullscreen.
function DesignerOverlay({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onAddLabel,
  onClose,
  onRemoveElement,
  onMoveElementBy,
  onResizeElementBy,
  onUpdateChart,
  onUpdateLabel,
  canvasRef,
  isExporting,
  onExportPdf,
}: {
  pages: MydasPageData[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onAddLabel: () => string;
  onClose: () => void;
  onRemoveElement: (id: string) => void;
  onMoveElementBy: (id: string, dx: number, dy: number) => void;
  onResizeElementBy: (id: string, dx: number, dy: number) => void;
  onUpdateChart: (id: string, patch: Partial<ChartElement>) => void;
  onUpdateLabel: (id: string, patch: Partial<LabelElement>) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isExporting: boolean;
  onExportPdf: () => void;
}) {
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const activePage = pages[activePageIndex];

  function handleAddLabel() {
    const id = onAddLabel();
    setSelectedLabelId(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm">
      {/* Toggled onto the canvas only while exporting — strips every editing
          control and card border so the captured image reads as a clean,
          presentation-style dashboard instead of the live editor. */}
      <style>{`
        .mydas-export-capture [data-capture-hide="true"] { display: none !important; }
        .mydas-export-capture [data-capture-box="true"] {
          border-color: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard Designer</p>

        <div className="flex flex-wrap items-center gap-1">
          {pages.map((page, index) => (
            <div key={page.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelectPage(index)}
                className={`min-h-8 rounded-l-md px-3 text-xs font-semibold ${
                  index === activePageIndex
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Page {index + 1}
              </button>
              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemovePage(index)}
                  aria-label={`Delete page ${index + 1}`}
                  className={`flex min-h-8 items-center rounded-r-md px-1.5 ${
                    index === activePageIndex
                      ? "bg-primary text-white/80 hover:text-white"
                      : "bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={onAddPage}
            aria-label="Add page"
            title="Add page"
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 text-xs font-semibold text-slate-500 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-400"
          >
            <Plus aria-hidden="true" className="size-3.5" /> Page
          </button>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleAddLabel}>
          <TypeIcon className="size-3.5" /> Add label
        </Button>

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onExportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />} PDF
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="size-3.5" /> Close
          </Button>
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-auto p-8">
        <div
          ref={canvasRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedLabelId(null);
          }}
          className="relative shrink-0 rounded-sm bg-white shadow-2xl dark:bg-slate-950"
          style={{ width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT }}
        >
          {activePage.elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-slate-400">
              Ask MYDAS a question or add a label, then drag and resize it here.
            </div>
          )}
          {activePage.elements.map((element) =>
            element.kind === "chart" ? (
              <DesignerChart
                key={element.id}
                element={element}
                onRemove={() => onRemoveElement(element.id)}
                onMoveBy={(dx, dy) => onMoveElementBy(element.id, dx, dy)}
                onResizeBy={(dx, dy) => onResizeElementBy(element.id, dx, dy)}
                onUpdateChart={(patch) => onUpdateChart(element.id, patch)}
              />
            ) : (
              <DesignerLabel
                key={element.id}
                element={element}
                isSelected={selectedLabelId === element.id}
                onSelect={() => setSelectedLabelId(element.id)}
                onRemove={() => onRemoveElement(element.id)}
                onMoveBy={(dx, dy) => onMoveElementBy(element.id, dx, dy)}
                onResizeBy={(dx, dy) => onResizeElementBy(element.id, dx, dy)}
                onUpdateLabel={(patch) => onUpdateLabel(element.id, patch)}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function MydasPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const [messages, setMessages] = useState<MydasMessage[]>([]);
  const [pages, setPages] = useState<MydasPageData[]>([{ id: "page-1", elements: [] }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [dashboards, setDashboards] = useState<MydasDashboardSummary[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isEditingDashboardName, setIsEditingDashboardName] = useState(false);
  const [draftDashboardName, setDraftDashboardName] = useState("");
  const skipNextAutoSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isAsking]);

  // Load the admin's dashboards on first visit — select the most recently
  // updated one, or create a fresh one if they have none yet.
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const list = await listMydasDashboards();
      let target: MydasDashboardSummary | undefined = list[0];
      if (!target) {
        const created = await createMydasDashboard("My Dashboard");
        target = { ...created, updatedAt: new Date() };
        list.unshift(target);
      }
      setDashboards(list);
      const loaded = await getMydasDashboard(target.id);
      skipNextAutoSaveRef.current = true;
      setCurrentDashboardId(target.id);
      setDashboardName(target.name);
      setPages(loaded?.pages && loaded.pages.length > 0 ? loaded.pages : [{ id: "page-1", elements: [] }]);
      setActivePageIndex(0);
      setIsDashboardLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Auto-save: debounce writes so rapid edits (dragging, typing) don't each
  // trigger their own request. Skipped once right after loading a dashboard,
  // so loading data back in doesn't immediately re-save it as "changed".
  useEffect(() => {
    if (isDashboardLoading || !currentDashboardId) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveMydasDashboard(currentDashboardId, pages).then((result) => {
        setSaveStatus(result.success ? "saved" : "error");
      });
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, currentDashboardId, isDashboardLoading]);

  async function switchDashboard(id: string) {
    if (id === currentDashboardId) return;
    setIsDashboardLoading(true);
    setIsDesignerOpen(false);
    const loaded = await getMydasDashboard(id);
    const summary = dashboards.find((d) => d.id === id);
    skipNextAutoSaveRef.current = true;
    setCurrentDashboardId(id);
    setDashboardName(summary?.name ?? "Untitled Dashboard");
    setPages(loaded?.pages && loaded.pages.length > 0 ? loaded.pages : [{ id: "page-1", elements: [] }]);
    setActivePageIndex(0);
    setIsDashboardLoading(false);
  }

  async function handleCreateDashboard() {
    const created = await createMydasDashboard("Untitled Dashboard");
    setDashboards((prev) => [{ ...created, updatedAt: new Date() }, ...prev]);
    setIsDesignerOpen(false);
    skipNextAutoSaveRef.current = true;
    setCurrentDashboardId(created.id);
    setDashboardName(created.name);
    setPages([{ id: "page-1", elements: [] }]);
    setActivePageIndex(0);
  }

  async function handleRenameDashboard(name: string) {
    if (!currentDashboardId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setDashboardName(trimmed);
    setDashboards((prev) => prev.map((d) => (d.id === currentDashboardId ? { ...d, name: trimmed } : d)));
    await renameMydasDashboard(currentDashboardId, trimmed);
  }

  async function handleDeleteDashboard() {
    if (!currentDashboardId || dashboards.length <= 1) return;
    if (!window.confirm(`Delete "${dashboardName}"? This can't be undone.`)) return;
    const remaining = dashboards.filter((d) => d.id !== currentDashboardId);
    await deleteMydasDashboard(currentDashboardId);
    setDashboards(remaining);
    await switchDashboard(remaining[0].id);
  }

  function updatePageElements(pageIndex: number, updater: (elements: CanvasElement[]) => CanvasElement[]) {
    setPages((prev) => prev.map((page, i) => (i === pageIndex ? { ...page, elements: updater(page.elements) } : page)));
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: "user", content: trimmed }]);
    setInput("");

    // MYDAS only adds charts — it has no concept of "delete"/"undo" over chat, so
    // catch that intent here instead of letting the AI misread it as a data
    // question and generate an unrelated chart (see the "remove it" bug report).
    if (/^(remove|delete|undo|clear)\b/i.test(trimmed)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: "MYDAS can't remove charts through chat — open the Designer and click the × on a chart to remove it.",
        },
      ]);
      return;
    }

    setIsAsking(true);

    const result = await askMydas(trimmed);

    if (!result.success) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", content: result.error, isError: true },
      ]);
      setIsAsking(false);
      return;
    }

    const reply: MydasReply = result.data;

    if (reply.kind === "text") {
      // Not a chart request (meta question, greeting, "remove X", etc.) — the AI
      // replies in plain text instead of being forced to invent a chart.
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", content: reply.message },
      ]);
      setIsAsking(false);
      return;
    }

    const chart = reply.chart;
    const sql = reply.sql;
    const targetPage = activePageIndex;
    updatePageElements(targetPage, (elements) => {
      const chartCount = elements.filter((el) => el.kind === "chart").length;
      const col = chartCount % 2;
      const row = Math.floor(chartCount / 2);
      const newElement: ChartElement = {
        id: `${Date.now()}-chart`,
        kind: "chart",
        chart,
        displayType: chart.type,
        showLegend: false,
        valueLabelPosition: "none",
        palette: "default",
        sql,
        x: 24 + col * (CHART_DEFAULT_WIDTH + 20),
        y: 24 + row * (CHART_DEFAULT_HEIGHT + 20),
        width: CHART_DEFAULT_WIDTH,
        height: CHART_DEFAULT_HEIGHT,
      };
      return [...elements, newElement];
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: `Added "${chart.title}" to page ${targetPage + 1}. Open the Designer to drag, resize, or restyle it.`,
      },
    ]);

    setIsAsking(false);
  }

  function removeElement(id: string) {
    updatePageElements(activePageIndex, (elements) => elements.filter((el) => el.id !== id));
  }

  function moveElementBy(id: string, dx: number, dy: number) {
    updatePageElements(activePageIndex, (elements) =>
      elements.map((el) =>
        el.id === id
          ? {
              ...el,
              x: Math.min(Math.max(0, el.x + dx), A4_CANVAS_WIDTH - 60),
              y: Math.min(Math.max(0, el.y + dy), A4_CANVAS_HEIGHT - 60),
            }
          : el,
      ),
    );
  }

  function resizeElementBy(id: string, dx: number, dy: number) {
    updatePageElements(activePageIndex, (elements) =>
      elements.map((el) => {
        if (el.id !== id) return el;
        const minWidth = el.kind === "chart" ? CHART_MIN_WIDTH : LABEL_MIN_WIDTH;
        const minHeight = el.kind === "chart" ? CHART_MIN_HEIGHT : LABEL_MIN_HEIGHT;
        return { ...el, width: Math.max(minWidth, el.width + dx), height: Math.max(minHeight, el.height + dy) };
      }),
    );
  }

  function updateChart(id: string, patch: Partial<ChartElement>) {
    updatePageElements(activePageIndex, (elements) =>
      elements.map((el) => (el.id === id && el.kind === "chart" ? { ...el, ...patch } : el)),
    );
  }

  function updateLabel(id: string, patch: Partial<LabelElement>) {
    updatePageElements(activePageIndex, (elements) =>
      elements.map((el) => (el.id === id && el.kind === "label" ? { ...el, ...patch } : el)),
    );
  }

  function addLabel() {
    const id = `${Date.now()}-label`;
    updatePageElements(activePageIndex, (elements) => [
      ...elements,
      { id, kind: "label", text: "New label", fontSize: 18, x: 24, y: 24, width: 220, height: 60 },
    ]);
    return id;
  }

  function addPage() {
    setPages((prev) => [...prev, { id: `page-${Date.now()}`, elements: [] }]);
    setActivePageIndex(pages.length);
  }

  function removePage(index: number) {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
    setActivePageIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  // Cycles through every page, capturing each one as a PNG before moving to the
  // next — flushSync forces the page-switch to actually re-render and paint
  // before we snapshot it, rather than racing React's normal async batching.
  async function captureAllPages(): Promise<string[]> {
    const originalIndex = activePageIndex;
    const images: string[] = [];
    canvasRef.current?.classList.add("mydas-export-capture");
    try {
      for (let i = 0; i < pages.length; i++) {
        flushSync(() => setActivePageIndex(i));
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (canvasRef.current) {
          images.push(await capturePageAsPng(canvasRef.current, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT));
        }
      }
    } finally {
      canvasRef.current?.classList.remove("mydas-export-capture");
      flushSync(() => setActivePageIndex(originalIndex));
    }
    return images;
  }

  async function handleExportPdf() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const images = await captureAllPages();
      await downloadDashboardAsPdf(images, "mydas-dashboard.pdf");
    } catch (error) {
      console.error("[MYDAS] PDF export failed:", error);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", content: "Couldn't export the dashboard as PDF. Please try again.", isError: true },
      ]);
    } finally {
      setIsExporting(false);
    }
  }

  const totalCharts = pages.reduce((sum, page) => sum + page.elements.filter((el) => el.kind === "chart").length, 0);

  return (
    <AdminPageWrapper
      title="MYDAS"
      description="Make Your Data Analytics Simple — ask in plain language, and build your own analytics dashboard from the answers."
      breadcrumbs={[{ label: "System" }, { label: "MYDAS" }]}
    >
      {isAuthLoading ? (
        // Matches the server's render exactly (no session is known yet during
        // SSR), so hydration can't diverge here — only resolve to
        // RestrictedNotice/the dashboard once the client confirms who's signed in.
        <div className="flex h-[560px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : !isAdmin ? (
        <RestrictedNotice />
      ) : isDashboardLoading ? (
        <div className="flex h-[560px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <select
              value={currentDashboardId ?? ""}
              onChange={(event) => void switchDashboard(event.target.value)}
              aria-label="Switch dashboard"
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </option>
              ))}
            </select>

            {isEditingDashboardName ? (
              <input
                autoFocus
                value={draftDashboardName}
                onChange={(event) => setDraftDashboardName(event.target.value)}
                onBlur={() => {
                  void handleRenameDashboard(draftDashboardName);
                  setIsEditingDashboardName(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleRenameDashboard(draftDashboardName);
                    setIsEditingDashboardName(false);
                  }
                  if (event.key === "Escape") setIsEditingDashboardName(false);
                }}
                aria-label="Dashboard name"
                className="min-h-9 min-w-0 flex-1 rounded border border-primary/40 bg-white px-2 text-sm font-semibold outline-none dark:bg-slate-950"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftDashboardName(dashboardName);
                  setIsEditingDashboardName(true);
                }}
                className="group flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800"
                title="Click to rename"
              >
                <span className="truncate">{dashboardName}</span>
                <Pencil aria-hidden="true" className="size-3 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            <span className="text-[11px] text-slate-400">
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && "Couldn't save"}
            </span>

            <Button type="button" variant="outline" size="sm" onClick={() => void handleCreateDashboard()}>
              <Plus className="size-3.5" /> New
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDeleteDashboard()}
              disabled={dashboards.length <= 1}
              title={dashboards.length <= 1 ? "You need at least one dashboard" : "Delete this dashboard"}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat panel */}
          <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              {DISCLAIMER}
            </div>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Sparkles aria-hidden="true" className="size-8 text-primary" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Ask MYDAS anything about your infrastructure data
                  </p>
                  <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    Type a question, or try one of these:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void ask(suggestion)}
                        disabled={isAsking}
                        className="min-h-11 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "bg-primary text-white"
                            : message.isError
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> MYDAS is thinking…
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(input);
                  }
                }}
                placeholder="Ask a question about your projects…"
                aria-label="Ask MYDAS a question"
                className="min-h-11 flex-1 resize-none"
                rows={1}
                disabled={isAsking}
              />
              <Button type="submit" size="icon-lg" aria-label="Send question" disabled={!input.trim() || isAsking}>
                {isAsking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </div>

          {/* Dashboard preview */}
          <div className="flex h-[560px] flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Your Dashboard</p>
            </div>
            {totalCharts === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <LayoutDashboard aria-hidden="true" className="size-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Your dashboard is empty</p>
                <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Charts you build from MYDAS answers will appear here, ready to lay out across A4 pages in the Designer.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <LayoutDashboard aria-hidden="true" className="size-8 text-primary" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {totalCharts} chart{totalCharts === 1 ? "" : "s"} across {pages.length} page{pages.length === 1 ? "" : "s"}
                </p>
                <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Open the Designer to drag, resize, add labels, and arrange them across A4 pages.
                </p>
                <Button type="button" onClick={() => setIsDesignerOpen(true)} className="mt-2">
                  <Expand className="size-4" /> Open Designer (A4, full screen)
                </Button>
                <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                  <Maximize2 className="size-3" /> Autosaved to &quot;{dashboardName}&quot; — safe to reload or come back later.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {isDesignerOpen && (
        <DesignerOverlay
          pages={pages}
          activePageIndex={activePageIndex}
          onSelectPage={setActivePageIndex}
          onAddPage={addPage}
          onRemovePage={removePage}
          onAddLabel={addLabel}
          onClose={() => setIsDesignerOpen(false)}
          onRemoveElement={removeElement}
          onMoveElementBy={moveElementBy}
          onResizeElementBy={resizeElementBy}
          onUpdateChart={updateChart}
          onUpdateLabel={updateLabel}
          canvasRef={canvasRef}
          isExporting={isExporting}
          onExportPdf={() => void handleExportPdf()}
        />
      )}
    </AdminPageWrapper>
  );
}

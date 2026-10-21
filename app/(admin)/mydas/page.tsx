"use client";

import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";
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
import { MydasChart } from "./mydas-chart";
import { MAX_CHART_ROWS, normalizeMydasPages } from "@/lib/mydas/chart-data";
import { buildCatalogAnswer } from "@/lib/mydas/analytics-catalog";
import type {
  MydasChartData,
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

const DISPLAY_TYPE_LABELS: Record<MydasDisplayType, string> = {
  bar: "Horizontal bars",
  column: "Vertical columns",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
  "stacked-bar-100": "100% stacked bars",
  "stacked-column": "Stacked columns",
  heatmap: "Highlight table",
  range: "Range with median",
  kpi: "KPI cards",
  trend: "Trend with projection",
};

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
// chart and label elements on the canvas. Moving is owned by DesignerOverlay (an
// element can be dropped on any page, which remounts it under a different canvas,
// so the drag can't rely on pointer capture held by this component). Resizing stays
// local: it never leaves the element's page. It uses pointer capture + per-move
// deltas (not absolute cursor position) and commits through a functional updater
// so rapid pointer events never read stale element state.
// The selected chrome (header above, footer below) floats outside the element's own
// box, so the content keeps the same (x, y, width, height) whether it's selected or
// not -- nothing shifts when you click away.
const OVERLAY_HEADER_HEIGHT = 36;
const OVERLAY_HEADER_MIN_WIDTH = 280;

function DraggableBox({
  id,
  x,
  y,
  width,
  height,
  minWidth,
  minHeight,
  pageIndex,
  pageCount,
  onDragStart,
  onMoveToPage,
  onResizeBy,
  header,
  onRemove,
  removeLabel,
  children,
  footer,
  selected = true,
  onSelect,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  pageIndex: number;
  pageCount: number;
  onDragStart: (event: React.PointerEvent) => void;
  onMoveToPage: (pageIndex: number) => void;
  onResizeBy: (dx: number, dy: number) => void;
  header: ReactNode;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const resizeStart = useRef<{ x: number; y: number } | null>(null);

  // Pointermove fires far faster than React (and Recharts' internal tick
  // measurement) can keep up with -- committing a setState per raw event
  // during a fast resize trips React's nested-update guard ("Maximum update
  // depth exceeded", surfacing from Recharts' RenderedTicksReporter inside
  // any chart on the canvas). Accumulate deltas and flush at most once per
  // animation frame instead.
  const pendingResize = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRafId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resizeRafId.current != null) cancelAnimationFrame(resizeRafId.current);
    };
  }, []);

  function flushResize() {
    resizeRafId.current = null;
    const pending = pendingResize.current;
    if (!pending) return;
    pendingResize.current = null;
    onResizeBy(pending.dx, pending.dy);
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
      onPointerDown={onDragStart}
      className="flex min-h-9 shrink-0 cursor-move touch-none items-center gap-1 border-b border-slate-100 bg-slate-50 px-1.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/60"
    >
      {header}
      {pageCount > 1 && (
        <select
          value={pageIndex}
          onChange={(event) => onMoveToPage(Number(event.target.value))}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Move to page"
          title="Move to page"
          data-move-page-for={id}
          data-capture-hide="true"
          className="min-h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {Array.from({ length: pageCount }, (_, index) => (
            <option key={index} value={index}>
              Page {index + 1}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={removeLabel}
        data-capture-hide="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
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
      className="absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none"
      style={{ background: "linear-gradient(135deg, transparent 50%, #94a3b8 50%)" }}
    />
  );

  if (!selected) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-element-id={id}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect?.();
        }}
        title="Click to edit"
        className="absolute cursor-pointer overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-slate-900"
        style={{ left: x, top: y, width, height }}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <div
        data-capture-hide="true"
        className="absolute overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
        style={{ left: x, top: y - OVERLAY_HEADER_HEIGHT, width, minWidth: OVERLAY_HEADER_MIN_WIDTH }}
      >
        {headerBar}
      </div>
      <div
        data-capture-box="true"
        data-element-id={id}
        className="absolute overflow-hidden rounded-sm bg-white ring-2 ring-primary/50 dark:bg-slate-900"
        style={{ left: x, top: y, width, height }}
      >
        {children}
        {resizeHandle}
      </div>
      {footer && (
        <div data-capture-hide="true" className="absolute" style={{ left: x, top: y + height + 6, width }}>
          {footer}
        </div>
      )}
    </>
  );
}

function WidgetDataEditor({
  chart,
  onUpdateChart,
}: {
  chart: MydasChartData;
  onUpdateChart: (patch: Partial<MydasChartData>) => void;
}) {
  function updateLabel(index: number, label: string) {
    onUpdateChart({ data: chart.data.map((row, i) => (i === index ? { ...row, label } : row)) });
  }
  function updateValue(rowIndex: number, seriesIndex: number, value: number) {
    onUpdateChart({
      data: chart.data.map((row, i) =>
        i === rowIndex
          ? { ...row, values: chart.seriesNames.map((_, s) => (s === seriesIndex ? value : (row.values[s] ?? 0))) }
          : row,
      ),
    });
  }
  function removeRow(index: number) {
    if (chart.data.length <= 1) return;
    onUpdateChart({ data: chart.data.filter((_, i) => i !== index) });
  }
  function addRow() {
    if (chart.data.length >= MAX_CHART_ROWS) return;
    onUpdateChart({ data: [...chart.data, { label: "New item", values: chart.seriesNames.map(() => 0) }] });
  }

  return (
    <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
      {chart.data.map((row, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={row.label}
            onChange={(event) => updateLabel(index, event.target.value.slice(0, 48))}
            aria-label={`Label for row ${index + 1}`}
            className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
          />
          {chart.seriesNames.map((name, seriesIndex) => (
            <input
              key={seriesIndex}
              type="number"
              min={0}
              value={row.values[seriesIndex] ?? 0}
              onChange={(event) => updateValue(index, seriesIndex, Math.max(0, Number(event.target.value) || 0))}
              aria-label={`${name} for row ${index + 1}`}
              title={name}
              className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
            />
          ))}
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
        disabled={chart.data.length >= MAX_CHART_ROWS}
        className="flex min-h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
      >
        <Plus aria-hidden="true" className="size-3.5" /> Add row {chart.data.length >= MAX_CHART_ROWS && `(max ${MAX_CHART_ROWS})`}
      </button>
    </div>
  );
}

function DesignerChart({
  element,
  pageIndex,
  pageCount,
  isSelected,
  onSelect,
  onRemove,
  onDragStart,
  onMoveToPage,
  onResizeBy,
  onUpdateChart,
}: {
  element: ChartElement;
  pageIndex: number;
  pageCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: (event: React.PointerEvent) => void;
  onMoveToPage: (pageIndex: number) => void;
  onResizeBy: (dx: number, dy: number) => void;
  onUpdateChart: (patch: Partial<ChartElement>) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(element.chart.title);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const isKpi = element.displayType === "kpi";

  function commitTitle() {
    const trimmed = draftTitle.trim();
    if (trimmed) onUpdateChart({ chart: { ...element.chart, title: trimmed } });
    else setDraftTitle(element.chart.title);
    setIsEditingTitle(false);
  }

  // The title row is part of the chart's own geometry in both states (editing and
  // deselected), so the chart doesn't shift when you click away. KPI cards carry
  // their own labels, so they skip the title row entirely.
  const titleRow = !isKpi && (
    <div className="flex h-9 shrink-0 items-center px-3">
      {isSelected && isEditingTitle ? (
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
      ) : isSelected ? (
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
      ) : (
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{element.chart.title}</p>
      )}
    </div>
  );

  const chartBody = (
    <div className="flex h-full flex-col">
      {titleRow}
      <div className="min-h-0 flex-1 p-1.5">
        <MydasChart
          chart={element.chart}
          type={element.displayType}
          showLegend={element.showLegend}
          valueLabelPosition={element.valueLabelPosition}
          colors={PALETTES[element.palette]}
        />
      </div>
    </div>
  );

  return (
    <DraggableBox
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      minWidth={CHART_MIN_WIDTH}
      minHeight={CHART_MIN_HEIGHT}
      pageIndex={pageIndex}
      pageCount={pageCount}
      onDragStart={onDragStart}
      onMoveToPage={onMoveToPage}
      onResizeBy={onResizeBy}
      onRemove={onRemove}
      removeLabel={`Remove "${element.chart.title}"`}
      selected={isSelected}
      onSelect={onSelect}
      header={
        <select
          value={element.displayType}
          onChange={(event) => onUpdateChart({ displayType: event.target.value as MydasDisplayType })}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Chart type"
          data-capture-hide="true"
          className="min-h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {(Object.keys(DISPLAY_TYPE_LABELS) as MydasDisplayType[]).map((option) => (
            <option key={option} value={option}>
              {DISPLAY_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      }
      footer={
        <div className="rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 py-1">
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
            <div className="max-h-48 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
              <WidgetDataEditor chart={element.chart} onUpdateChart={(patch) => onUpdateChart({ chart: { ...element.chart, ...patch } })} />
            </div>
          )}
        </div>
      }
    >
      {chartBody}
    </DraggableBox>
  );
}

function DesignerLabel({
  element,
  pageIndex,
  pageCount,
  isSelected,
  onSelect,
  onRemove,
  onDragStart,
  onMoveToPage,
  onResizeBy,
  onUpdateLabel,
}: {
  element: LabelElement;
  pageIndex: number;
  pageCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: (event: React.PointerEvent) => void;
  onMoveToPage: (pageIndex: number) => void;
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
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      minWidth={LABEL_MIN_WIDTH}
      minHeight={LABEL_MIN_HEIGHT}
      pageIndex={pageIndex}
      pageCount={pageCount}
      onDragStart={onDragStart}
      onMoveToPage={onMoveToPage}
      onResizeBy={onResizeBy}
      onRemove={onRemove}
      removeLabel="Remove label"
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

// Pointer within this many px of the scroll area's top/bottom edge scrolls it
// while an element is being dragged; the speed ramps up toward the edge.
const AUTOSCROLL_EDGE = 80;
const AUTOSCROLL_MAX_SPEED = 20;

function autoScrollSpeed(pointerY: number, area: DOMRect): number {
  const fromTop = pointerY - area.top;
  const fromBottom = area.bottom - pointerY;
  if (fromTop < AUTOSCROLL_EDGE) return -Math.min(1, (AUTOSCROLL_EDGE - fromTop) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_SPEED;
  if (fromBottom < AUTOSCROLL_EDGE) return Math.min(1, (AUTOSCROLL_EDGE - fromBottom) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_SPEED;
  return 0;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Full-viewport A4 design area. Built as a plain fixed overlay rather than the
// real Fullscreen API — more reliable across browsers/embedded contexts, and all
// we actually need is "take over the screen", not true OS-level fullscreen.
// Every page is stacked in one scroll area, so an element can be dragged from one
// page to another without switching anything.
function DesignerOverlay({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onAddLabel,
  onClose,
  onRemoveElement,
  onMoveElementTo,
  onResizeElementBy,
  onUpdateChart,
  onUpdateLabel,
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
  onMoveElementTo: (id: string, pageIndex: number, position?: { x: number; y: number }) => void;
  onResizeElementBy: (id: string, dx: number, dy: number) => void;
  onUpdateChart: (id: string, patch: Partial<ChartElement>) => void;
  onUpdateLabel: (id: string, patch: Partial<LabelElement>) => void;
  isExporting: boolean;
  onExportPdf: () => void;
}) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dropPageIndex, setDropPageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const previousPageCount = useRef(pages.length);

  function scrollToPage(index: number, smooth: boolean) {
    const section = scrollRef.current?.querySelectorAll<HTMLElement>("[data-mydas-page]")[index];
    section?.scrollIntoView({ block: "start", behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }

  // The overlay is rendered only while open, so this runs once per open.
  const initialPageIndex = useRef(activePageIndex);
  useEffect(() => {
    scrollToPage(initialPageIndex.current, false);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // A page added from "+ Page" scrolls itself into view.
  useEffect(() => {
    if (pages.length > previousPageCount.current) scrollToPage(pages.length - 1, true);
    previousPageCount.current = pages.length;
  }, [pages.length]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  function canvasElements(): HTMLElement[] {
    return Array.from(scrollRef.current?.querySelectorAll<HTMLElement>("[data-mydas-page-canvas]") ?? []);
  }

  // The "current" page (where Add label and new MYDAS charts land) is whichever
  // page fills most of the scroll area.
  function syncActivePage() {
    const area = scrollRef.current?.getBoundingClientRect();
    if (!area) return;
    let best = -1;
    let bestVisible = 0;
    canvasElements().forEach((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const visible = Math.min(rect.bottom, area.bottom) - Math.max(rect.top, area.top);
      if (visible > bestVisible) {
        bestVisible = visible;
        best = index;
      }
    });
    if (best >= 0 && best !== activePageIndex) onSelectPage(best);
  }

  // Moves an element under the pointer, picking whichever page is nearest to it
  // vertically, and scrolls the area while the pointer sits near its top/bottom
  // edge. Window-level listeners (not pointer capture) because the element is
  // remounted under another page's canvas when it crosses over.
  function startElementDrag(id: string, event: React.PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.target as Element;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);

    const box = scrollRef.current?.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`);
    const rect = box?.getBoundingClientRect();
    const pointer = { x: event.clientX, y: event.clientY };
    const offset = { x: rect ? event.clientX - rect.left : 0, y: rect ? event.clientY - rect.top : 0 };
    let lastApplied = "";
    let lastDropIndex: number | null = null;
    let frameId = 0;

    function onPointerMove(moveEvent: PointerEvent) {
      pointer.x = moveEvent.clientX;
      pointer.y = moveEvent.clientY;
    }

    function frame() {
      const area = scrollRef.current;
      if (area) {
        const speed = autoScrollSpeed(pointer.y, area.getBoundingClientRect());
        if (speed !== 0) area.scrollTop += speed;

        const canvases = canvasElements();
        let targetIndex = -1;
        let nearest = Infinity;
        canvases.forEach((canvas, index) => {
          const bounds = canvas.getBoundingClientRect();
          const distance = pointer.y < bounds.top ? bounds.top - pointer.y : pointer.y > bounds.bottom ? pointer.y - bounds.bottom : 0;
          if (distance < nearest) {
            nearest = distance;
            targetIndex = index;
          }
        });
        const key = `${pointer.x}|${pointer.y}|${area.scrollTop}|${area.scrollLeft}`;
        if (targetIndex >= 0 && key !== lastApplied) {
          lastApplied = key;
          const bounds = canvases[targetIndex].getBoundingClientRect();
          onMoveElementTo(id, targetIndex, { x: pointer.x - bounds.left - offset.x, y: pointer.y - bounds.top - offset.y });
          if (targetIndex !== lastDropIndex) {
            lastDropIndex = targetIndex;
            setDropPageIndex(targetIndex);
          }
        }
      }
      frameId = requestAnimationFrame(frame);
    }

    function finish() {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      dragCleanupRef.current = null;
      setDropPageIndex(null);
    }

    dragCleanupRef.current?.();
    dragCleanupRef.current = finish;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    frameId = requestAnimationFrame(frame);
    setSelectedElementId(id);
  }

  function moveToPage(id: string, pageIndex: number) {
    onMoveElementTo(id, pageIndex);
    scrollToPage(pageIndex, true);
    // The element remounts under the new page; hand focus back to its page picker.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.querySelector<HTMLElement>(`[data-move-page-for="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
      });
    });
  }

  function handleAddLabel() {
    const id = onAddLabel();
    setSelectedElementId(id);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
      });
    });
  }

  function handleRemovePage(index: number) {
    if (pages.length <= 1) return;
    const count = pages[index].elements.length;
    if (count > 0 && !window.confirm(`Delete page ${index + 1} and its ${count} item${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    onRemovePage(index);
  }

  const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm">
      {/* Toggled onto each canvas only while exporting — strips every editing
          control and card border so the captured image reads as a clean,
          presentation-style dashboard instead of the live editor. */}
      <style>{`
        .mydas-export-capture [data-capture-hide="true"] { display: none !important; }
        .mydas-export-capture,
        .mydas-export-capture [data-capture-box="true"] {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard Designer</p>

        <Button type="button" variant="outline" className="h-11 px-3" onClick={onAddPage}>
          <Plus className="size-3.5" /> Page
        </Button>
        <Button type="button" variant="outline" className="h-11 px-3" onClick={handleAddLabel} title={`Add a label to page ${activePageIndex + 1}`}>
          <TypeIcon className="size-3.5" /> Add label
        </Button>
        <p className="text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
          Page {activePageIndex + 1} of {pages.length}
        </p>

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" className="h-11 px-3" onClick={onExportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />} PDF
          </Button>
          <Button type="button" variant="outline" className="h-11 px-3" onClick={onClose}>
            <X className="size-3.5" /> Close
          </Button>
        </div>
      </div>
      <div ref={scrollRef} onScroll={syncActivePage} className="flex-1 overflow-auto p-8">
        <div className="mx-auto flex w-fit flex-col gap-12">
          {pages.map((page, pageIndex) => (
            <section
              key={page.id}
              data-mydas-page="true"
              aria-label={`Page ${pageIndex + 1}`}
              // The page holding the selected element sits above its neighbours so
              // the floating header/footer aren't covered by the next page.
              className={`flex shrink-0 flex-col gap-10 ${page.elements.some((el) => el.id === selectedElementId) ? "relative z-10" : ""}`}
              style={{ width: A4_CANVAS_WIDTH }}
            >
              <div className="flex min-h-11 items-center justify-between rounded-md bg-white px-3 dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Page {pageIndex + 1} <span className="font-normal text-slate-600 dark:text-slate-400">of {pages.length}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleRemovePage(pageIndex)}
                  disabled={pages.length <= 1}
                  title={pages.length <= 1 ? "A dashboard needs at least one page" : `Delete page ${pageIndex + 1}`}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-700 dark:text-slate-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 ${focusRing}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" /> Delete page
                  <span className="sr-only"> {pageIndex + 1}</span>
                </button>
              </div>
              <div
                data-mydas-page-canvas="true"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setSelectedElementId(null);
                }}
                className={`relative shrink-0 rounded-sm bg-white shadow-2xl dark:bg-slate-950 ${dropPageIndex === pageIndex ? "outline-4 outline-primary" : ""}`}
                style={{ width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT }}
              >
                {page.elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-slate-600">
                    Ask MYDAS a question or add a label, then drag and resize it here.
                  </div>
                )}
                {page.elements.map((element) =>
                  element.kind === "chart" ? (
                    <DesignerChart
                      key={element.id}
                      element={element}
                      pageIndex={pageIndex}
                      pageCount={pages.length}
                      isSelected={selectedElementId === element.id}
                      onSelect={() => setSelectedElementId(element.id)}
                      onRemove={() => onRemoveElement(element.id)}
                      onDragStart={(event) => startElementDrag(element.id, event)}
                      onMoveToPage={(target) => moveToPage(element.id, target)}
                      onResizeBy={(dx, dy) => onResizeElementBy(element.id, dx, dy)}
                      onUpdateChart={(patch) => onUpdateChart(element.id, patch)}
                    />
                  ) : (
                    <DesignerLabel
                      key={element.id}
                      element={element}
                      pageIndex={pageIndex}
                      pageCount={pages.length}
                      isSelected={selectedElementId === element.id}
                      onSelect={() => setSelectedElementId(element.id)}
                      onRemove={() => onRemoveElement(element.id)}
                      onDragStart={(event) => startElementDrag(element.id, event)}
                      onMoveToPage={(target) => moveToPage(element.id, target)}
                      onResizeBy={(dx, dy) => onResizeElementBy(element.id, dx, dy)}
                      onUpdateLabel={(patch) => onUpdateLabel(element.id, patch)}
                    />
                  ),
                )}
              </div>
            </section>
          ))}
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
      setPages(loaded?.pages && loaded.pages.length > 0 ? normalizeMydasPages(loaded.pages) : [{ id: "page-1", elements: [] }]);
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
    setPages(loaded?.pages && loaded.pages.length > 0 ? normalizeMydasPages(loaded.pages) : [{ id: "page-1", elements: [] }]);
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
      // Not a chart request (greeting, "remove X", off-topic, etc.) — the AI replies
      // in plain text instead of being forced to invent a chart.
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", content: reply.message },
      ]);
      setIsAsking(false);
      return;
    }

    if (reply.kind === "catalog") {
      // Built from the same catalog that drives chart generation, so the list of
      // analytics here always matches what the designer can actually render.
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: buildCatalogAnswer("Here are the analytics I can generate for InfraWatch data:"),
        },
      ]);
      setIsAsking(false);
      return;
    }

    const chart = reply.chart;
    const displayType = reply.displayType;
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
        displayType,
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

  // Elements are addressed by id across every page, since the designer shows all
  // pages at once and any element can be touched from any of them.
  function mapElements(updater: (element: CanvasElement) => CanvasElement) {
    setPages((prev) =>
      prev.map((page) => {
        let changed = false;
        const elements = page.elements.map((element) => {
          const next = updater(element);
          if (next !== element) changed = true;
          return next;
        });
        return changed ? { ...page, elements } : page;
      }),
    );
  }

  function removeElement(id: string) {
    setPages((prev) => prev.map((page) => (page.elements.some((el) => el.id === id) ? { ...page, elements: page.elements.filter((el) => el.id !== id) } : page)));
  }

  // Puts an element on the given page (appended, so it sits on top), keeping its
  // size. With a position it lands there, otherwise it keeps its current x/y.
  // Either way it is clamped so the whole element stays inside the page.
  function moveElementTo(id: string, pageIndex: number, position?: { x: number; y: number }) {
    setPages((prev) => {
      const targetPage = prev[pageIndex];
      if (!targetPage) return prev;
      let sourceIndex = -1;
      let moving: CanvasElement | undefined;
      for (let i = 0; i < prev.length && !moving; i++) {
        moving = prev[i].elements.find((el) => el.id === id);
        sourceIndex = i;
      }
      if (!moving) return prev;

      const x = Math.min(Math.max(0, position?.x ?? moving.x), Math.max(0, A4_CANVAS_WIDTH - moving.width));
      const y = Math.min(Math.max(0, position?.y ?? moving.y), Math.max(0, A4_CANVAS_HEIGHT - moving.height));
      if (sourceIndex === pageIndex && x === moving.x && y === moving.y) return prev;

      const moved = { ...moving, x, y };
      return prev.map((page, i) => {
        if (i === sourceIndex && i === pageIndex) return { ...page, elements: page.elements.map((el) => (el.id === id ? moved : el)) };
        if (i === sourceIndex) return { ...page, elements: page.elements.filter((el) => el.id !== id) };
        if (i === pageIndex) return { ...page, elements: [...page.elements, moved] };
        return page;
      });
    });
  }

  function resizeElementBy(id: string, dx: number, dy: number) {
    mapElements((el) => {
      if (el.id !== id) return el;
      const minWidth = el.kind === "chart" ? CHART_MIN_WIDTH : LABEL_MIN_WIDTH;
      const minHeight = el.kind === "chart" ? CHART_MIN_HEIGHT : LABEL_MIN_HEIGHT;
      // Grow no further than the page edge (an element already past it keeps its size).
      const maxWidth = Math.max(el.width, A4_CANVAS_WIDTH - el.x);
      const maxHeight = Math.max(el.height, A4_CANVAS_HEIGHT - el.y);
      return {
        ...el,
        width: Math.min(maxWidth, Math.max(minWidth, el.width + dx)),
        height: Math.min(maxHeight, Math.max(minHeight, el.height + dy)),
      };
    });
  }

  function updateChart(id: string, patch: Partial<ChartElement>) {
    mapElements((el) => (el.id === id && el.kind === "chart" ? { ...el, ...patch } : el));
  }

  function updateLabel(id: string, patch: Partial<LabelElement>) {
    mapElements((el) => (el.id === id && el.kind === "label" ? { ...el, ...patch } : el));
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

  // Every page canvas is already on screen (stacked in the designer), so each one
  // is captured as a PNG in turn, in page order.
  async function captureAllPages(): Promise<string[]> {
    const canvases = Array.from(document.querySelectorAll<HTMLElement>("[data-mydas-page-canvas]"));
    const images: string[] = [];
    canvases.forEach((canvas) => canvas.classList.add("mydas-export-capture"));
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      for (const canvas of canvases) {
        images.push(await capturePageAsPng(canvas, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT));
      }
    } finally {
      canvases.forEach((canvas) => canvas.classList.remove("mydas-export-capture"));
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
                        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
          onMoveElementTo={moveElementTo}
          onResizeElementBy={resizeElementBy}
          onUpdateChart={updateChart}
          onUpdateLabel={updateLabel}
          isExporting={isExporting}
          onExportPdf={() => void handleExportPdf()}
        />
      )}
    </AdminPageWrapper>
  );
}

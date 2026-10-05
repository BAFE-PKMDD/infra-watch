"use client";

import { useMemo } from "react";
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

import type { MydasChartData, MydasChartRow, MydasDisplayType, ValueLabelPosition } from "@/types/mydas.types";

export function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-PH", {
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

const TOOLTIP_STYLE = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 };
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };
const CATEGORY_AXIS_TICK = { fontSize: 10, fill: "#475569" };
const LEGEND_STYLE = { fontSize: 11 };
const CHART_MARGIN = { top: 4, right: 12, bottom: 4, left: 0 };
const COLUMN_CHART_MARGIN = { top: 4, right: 12, bottom: 24, left: 0 };
const CATEGORY_WIDTH = 88;

// Module-level so their identity never changes between renders -- Recharts' tick
// memoization churns when these are recreated, which is what caused the
// "Maximum update depth exceeded" crash during widget resize.
const formatAxisTick = (value: number | string) => formatChartValue(Number(value));
const formatPercentTick = (value: number | string) => `${Math.round(Number(value) * 100)}%`;
const valueLabelFormatter = (value: string | number | boolean | null | undefined) => formatChartValue(Number(value ?? 0));
function tooltipValueFormatter(value: unknown, name: unknown): [string, string] {
  return [formatChartValue(Number(value ?? 0)), String(name ?? "")];
}

type KeyedRow = Record<string, string | number>;
type RangeDatum = { label: string; base: number; span: number; median: number; low: number; high: number };

const seriesKey = (index: number) => `s${index}`;

function toKeyedRows(data: MydasChartRow[], seriesCount: number): KeyedRow[] {
  return data.map((row) => {
    const entry: KeyedRow = { label: row.label };
    for (let index = 0; index < seriesCount; index += 1) {
      entry[seriesKey(index)] = row.values[index] ?? 0;
    }
    return entry;
  });
}

// Minimum, median, and maximum, ordered defensively so a bad ordering from the data
// can't draw a negative-width bar.
function toRangeRows(data: MydasChartRow[]): RangeDatum[] {
  return data.map((row) => {
    const first = row.values[0] ?? 0;
    const second = row.values[1] ?? first;
    const third = row.values[2] ?? second;
    const low = Math.min(first, second, third);
    const high = Math.max(first, second, third);
    const median = Math.min(Math.max(second, low), high);
    return { label: row.label, base: low, span: high - low, median, low, high };
  });
}

// Actual values and projected values go on separate lines. The last actual point is
// repeated on the projected line so the dashed segment starts where the solid one ends.
function toTrendRows(data: MydasChartRow[]): KeyedRow[] {
  const lastActualIndex = data.reduce((last, row, index) => (row.projected ? last : index), -1);
  return data.map((row, index) => {
    const value = row.values[0] ?? 0;
    const entry: KeyedRow = { label: row.label };
    if (!row.projected) entry.actual = value;
    if (row.projected || index === lastActualIndex) entry.projected = value;
    return entry;
  });
}

function RangeBarShape(props: unknown) {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#2563eb", payload } = props as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    payload?: RangeDatum;
  };
  const medianOffset =
    payload && payload.span > 0 ? ((payload.median - payload.low) / payload.span) * width : width / 2;
  const medianX = x + medianOffset;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} fillOpacity={0.35} stroke={fill} />
      <line x1={medianX} x2={medianX} y1={y} y2={y + height} stroke={fill} strokeWidth={3} />
    </g>
  );
}

function RangeTooltip(props: unknown) {
  const { active, payload } = props as { active?: boolean; payload?: { payload?: RangeDatum }[] };
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-white">{datum.label}</p>
      <p className="text-slate-600 dark:text-slate-300">Minimum: {formatChartValue(datum.low)}</p>
      <p className="text-slate-600 dark:text-slate-300">Median: {formatChartValue(datum.median)}</p>
      <p className="text-slate-600 dark:text-slate-300">Maximum: {formatChartValue(datum.high)}</p>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
}

function HeatmapTable({ chart, color }: { chart: MydasChartData; color: string }) {
  const max = Math.max(0, ...chart.data.flatMap((row) => row.values));
  return (
    <div className="h-full w-full overflow-auto p-2">
      <table className="w-full border-separate border-spacing-0.5 text-[10px]">
        <thead>
          <tr>
            <th scope="col" className="px-1 py-1 text-left font-semibold text-slate-600 dark:text-slate-300">
              Category
            </th>
            {chart.seriesNames.map((name, index) => (
              <th key={`${name}-${index}`} scope="col" className="px-1 py-1 text-center font-semibold text-slate-600 dark:text-slate-300">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.data.map((row, rowIndex) => (
            <tr key={`${row.label}-${rowIndex}`}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left font-medium text-slate-700 dark:text-slate-200">
                {row.label}
              </th>
              {chart.seriesNames.map((_, columnIndex) => {
                const value = row.values[columnIndex] ?? 0;
                const intensity = max > 0 ? value / max : 0;
                return (
                  <td
                    key={columnIndex}
                    className="rounded px-1 py-1.5 text-center font-mono tabular-nums"
                    style={{
                      backgroundColor: hexToRgba(color, 0.08 + 0.87 * intensity),
                      color: intensity > 0.55 ? "#ffffff" : "#0f172a",
                    }}
                  >
                    {formatChartValue(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCards({ data, color }: { data: MydasChartRow[]; color: string }) {
  return (
    <div className="flex h-full w-full flex-wrap content-center items-stretch justify-center gap-2 overflow-auto p-2">
      {data.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="flex min-w-[120px] flex-1 flex-col justify-center rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{row.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
            {formatChartValue(row.values[0] ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Fills 100% of its parent (rather than sizing itself off data length), so a
// widget's own resize handle actually changes the rendered chart size.
export function MydasChart({
  chart,
  type,
  showLegend,
  valueLabelPosition,
  colors,
}: {
  chart: MydasChartData;
  type: MydasDisplayType;
  showLegend: boolean;
  valueLabelPosition: ValueLabelPosition;
  colors: string[];
}) {
  const seriesCount = chart.seriesNames.length;
  const isSingleSeries = seriesCount <= 1;
  const seriesColor = (index: number) => colors[index % colors.length];
  const keyedRows = useMemo(() => toKeyedRows(chart.data, seriesCount), [chart.data, seriesCount]);
  const pieRows = useMemo(
    () => chart.data.map((row) => ({ label: row.label, value: row.values[0] ?? 0 })),
    [chart.data],
  );
  const rangeRows = useMemo(() => toRangeRows(chart.data), [chart.data]);
  const trendRows = useMemo(() => toTrendRows(chart.data), [chart.data]);

  if (type === "trend") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendRows} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Line
            dataKey="actual"
            name={chart.seriesNames[0]}
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ r: 3, fill: colors[0] }}
            isAnimationActive={false}
          />
          <Line
            dataKey="projected"
            name="Projected"
            stroke={colors[0]}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: "#ffffff", stroke: colors[0] }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "heatmap") {
    return <HeatmapTable chart={chart} color={colors[0]} />;
  }

  if (type === "kpi") {
    return <KpiCards data={chart.data} color={colors[0]} />;
  }

  if (type === "pie" || type === "donut") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieRows}
            dataKey="value"
            nameKey="label"
            innerRadius={type === "donut" ? "55%" : "35%"}
            outerRadius="75%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {pieRows.map((item, index) => (
              <Cell key={`${item.label}-${index}`} fill={seriesColor(index)} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipValueFormatter} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={keyedRows} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          {chart.seriesNames.map((name, index) => (
            <Line
              key={seriesKey(index)}
              type="monotone"
              dataKey={seriesKey(index)}
              name={name}
              stroke={seriesColor(index)}
              strokeWidth={2}
              dot={{ r: 3, fill: seriesColor(index) }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={keyedRows} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          {chart.seriesNames.map((name, index) => (
            <Area
              key={seriesKey(index)}
              type="monotone"
              dataKey={seriesKey(index)}
              name={name}
              stroke={seriesColor(index)}
              fill={seriesColor(index)}
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "stacked-column") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={keyedRows} margin={COLUMN_CHART_MARGIN}>
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
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          {chart.seriesNames.map((name, index) => (
            <Bar
              key={seriesKey(index)}
              dataKey={seriesKey(index)}
              name={name}
              stackId="stack"
              fill={seriesColor(index)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "stacked-bar-100") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={keyedRows} layout="vertical" stackOffset="expand" margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={AXIS_TICK} tickFormatter={formatPercentTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={CATEGORY_WIDTH} tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          {chart.seriesNames.map((name, index) => (
            <Bar
              key={seriesKey(index)}
              dataKey={seriesKey(index)}
              name={name}
              stackId="stack"
              fill={seriesColor(index)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "range") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rangeRows} layout="vertical" margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={CATEGORY_WIDTH} tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip content={RangeTooltip} />
          <Bar dataKey="base" stackId="range" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="span" stackId="range" fill={colors[0]} isAnimationActive={false} shape={RangeBarShape} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "column") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={keyedRows} margin={COLUMN_CHART_MARGIN}>
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
          <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
          {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
          {chart.seriesNames.map((name, index) => (
            <Bar
              key={seriesKey(index)}
              dataKey={seriesKey(index)}
              name={name}
              radius={[5, 5, 0, 0]}
              fill={seriesColor(index)}
              isAnimationActive={false}
            >
              {isSingleSeries &&
                keyedRows.map((_, rowIndex) => <Cell key={rowIndex} fill={seriesColor(rowIndex)} />)}
              {isSingleSeries && valueLabelPosition !== "none" && (
                <LabelList
                  dataKey={seriesKey(index)}
                  position={valueLabelPosition === "inside" ? "inside" : "top"}
                  formatter={valueLabelFormatter}
                  style={{ fontSize: 10, fill: valueLabelPosition === "inside" ? "#ffffff" : "#475569" }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={keyedRows} layout="vertical" margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={AXIS_TICK} tickFormatter={formatAxisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={CATEGORY_WIDTH} tick={CATEGORY_AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} />
        {showLegend && <Legend wrapperStyle={LEGEND_STYLE} />}
        {chart.seriesNames.map((name, index) => (
          <Bar
            key={seriesKey(index)}
            dataKey={seriesKey(index)}
            name={name}
            radius={[0, 5, 5, 0]}
            fill={seriesColor(index)}
            isAnimationActive={false}
          >
            {isSingleSeries &&
              keyedRows.map((_, rowIndex) => <Cell key={rowIndex} fill={seriesColor(rowIndex)} />)}
            {isSingleSeries && valueLabelPosition !== "none" && (
              <LabelList
                dataKey={seriesKey(index)}
                position={valueLabelPosition === "inside" ? "insideRight" : "right"}
                formatter={valueLabelFormatter}
                style={{ fontSize: 10, fill: valueLabelPosition === "inside" ? "#ffffff" : "#475569" }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

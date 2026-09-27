"use client";

import { Bar, BarChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type RangeDotRow = { key: string; label: string; median: number; p25: number; p75: number };

/** A dot for the typical (median) value plus a bar for the usual (p25-p75) range, one row per category. */
export function RangeDotChart({
  rows,
  valueFormatter,
  ariaLabel,
  referenceValue,
}: {
  rows: RangeDotRow[];
  valueFormatter: (value: number) => string;
  ariaLabel: string;
  referenceValue?: number;
}) {
  const chartData = rows.map((row) => ({ ...row, offset: row.p25, range: Math.max(row.p75 - row.p25, 0) }));

  return (
    <ChartContainer
      config={{ range: { label: "Usual range", color: "var(--a-s1, #93c5fd)" } }}
      className="w-full aspect-auto"
      style={{ height: Math.max(chartData.length * 32, 160) }}
      role="img"
      aria-label={ariaLabel}
    >
      <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 40 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => valueFormatter(Number(value))} />
        <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        {referenceValue !== undefined && (
          <ReferenceLine x={referenceValue} stroke="var(--foreground)" strokeOpacity={0.4} strokeDasharray="4 4" />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, name, item) => {
                if (name !== "range") return null;
                const row = item.payload as RangeDotRow;
                return <span>Typical {valueFormatter(row.median)} &middot; usual range {valueFormatter(row.p25)}&ndash;{valueFormatter(row.p75)}</span>;
              }}
            />
          }
        />
        <Bar dataKey="offset" stackId="range" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="range" name="range" stackId="range" fill="var(--color-range)" radius={[4, 4, 4, 4]} isAnimationActive={false} />
        {chartData.map((row) => (
          <ReferenceDot key={row.key} x={row.median} y={row.label} r={5} fill="var(--a-accent, #1d6a48)" stroke="none" />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

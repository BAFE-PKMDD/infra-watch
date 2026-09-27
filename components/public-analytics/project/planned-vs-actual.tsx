"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { PowPoint } from "@/lib/public-analytics/rules";
import { publicAnalyticsStrings as S } from "@/lib/public-analytics/strings";

const t = S.en;

const monthFormatter = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit", timeZone: "UTC" });
const formatMonth = (value: string) => monthFormatter.format(new Date(`${value}T00:00:00Z`));

export function PlannedVsActual({ points }: { points: PowPoint[] }) {
  const last = points[points.length - 1];
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-base text-pa-ink">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0.5 w-6" style={{ background: "var(--context)" }} />
          {t.project.planned}: {last.target} out of 100
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0.5 w-6" style={{ background: "var(--series)" }} />
          {t.project.actual}: {last.actual} out of 100
        </li>
      </ul>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 256 }}>
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--hair)" strokeWidth={1} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatMonth} stroke="var(--axis)" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} minTickGap={24} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} stroke="var(--axis)" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} width={36} />
            <Line type="linear" dataKey="target" name={t.project.planned} stroke="var(--context)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="linear" dataKey="actual" name={t.project.actual} stroke="var(--series)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 group">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-pa-accent underline-offset-4 hover:underline">
          <span className="group-open:hidden">{t.chart.viewTable}</span>
          <span className="hidden group-open:inline">{t.chart.hideTable}</span>
        </summary>
        <div className="mt-2 overflow-x-auto rounded border border-pa-hair">
          <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
            <thead className="bg-pa-surface-2 text-pa-ink-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Month</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t.project.planned}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t.project.actual}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-t border-pa-hair">
                  <th scope="row" className="px-3 py-2 font-normal text-pa-ink">{formatMonth(point.date)}</th>
                  <td className="px-3 py-2 text-right tabular-nums text-pa-ink">{point.target}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-pa-ink">{point.actual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

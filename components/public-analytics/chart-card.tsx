"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { publicAnalyticsStrings as S, formatCount, formatPesos, formatPesosShort } from "@/lib/public-analytics/strings";

const t = S.en;

export type Measure = "pesos" | "projects";

export type ChartRow = {
  key: string;
  label: string;
  projects: number;
  pesos?: number;
};

export function Section({ id, title, description, children, className }: { id?: string; title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={cn("rounded-lg border border-pa-hair bg-pa-surface p-4 sm:p-6", className)}>
      <h2 id={headingId} className="pa-heading text-xl font-semibold text-pa-ink sm:text-2xl">{title}</h2>
      {description ? <div className="mt-1 text-base text-pa-ink-2">{description}</div> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MeasureToggle({ value, onChange, label }: { value: Measure; onChange: (value: Measure) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-pa-axis bg-pa-surface-2 p-0.5">
      {(["pesos", "projects"] as const).map((measure) => (
        <button
          key={measure}
          type="button"
          aria-pressed={value === measure}
          onClick={() => onChange(measure)}
          className={cn(
            "min-h-11 rounded px-4 text-base font-medium",
            value === measure ? "bg-pa-accent text-pa-surface" : "text-pa-ink-2 hover:bg-pa-accent-soft",
          )}
        >
          {measure === "pesos" ? t.chart.pesos : t.chart.projects}
        </button>
      ))}
    </div>
  );
}

export function DataTable({ rows, showPesos, labelHeader }: { rows: ChartRow[]; showPesos: boolean; labelHeader?: string }) {
  return (
    <details className="mt-4 group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded px-1 text-base font-medium text-pa-accent underline-offset-4 hover:underline">
        <span className="group-open:hidden">{t.chart.viewTable}</span>
        <span className="hidden group-open:inline">{t.chart.hideTable}</span>
      </summary>
      <div className="mt-2 max-w-full overflow-x-auto rounded border border-pa-hair">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
          <thead className="bg-pa-surface-2 text-pa-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{labelHeader ?? t.chart.tableLabel}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{t.chart.tableProjects}</th>
              {showPesos ? <th scope="col" className="px-3 py-2 text-right font-medium">{t.chart.tablePesos}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-pa-hair">
                <th scope="row" className="px-3 py-2 font-normal text-pa-ink">{row.label}</th>
                <td className="px-3 py-2 text-right tabular-nums text-pa-ink">{formatCount(row.projects)}</td>
                {showPesos ? <td className="px-3 py-2 text-right tabular-nums text-pa-ink">{formatPesos(row.pesos ?? 0)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function valueLabel(row: ChartRow, measure: Measure) {
  return measure === "pesos" ? formatPesosShort(row.pesos ?? 0) : formatCount(row.projects);
}

/** Ranked horizontal bars that start at zero, with the value written at the end of each bar. */
export function HorizontalBars({
  rows,
  measure,
  color = "var(--series)",
  limit,
  selectedKey,
  onSelect,
  selectLabel,
}: {
  rows: ChartRow[];
  measure: Measure;
  color?: string;
  limit?: number;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  selectLabel?: (row: ChartRow) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...rows].sort((a, b) => (measure === "pesos" ? (b.pesos ?? 0) - (a.pesos ?? 0) : b.projects - a.projects));
  const visible = limit && !expanded ? sorted.slice(0, limit) : sorted;
  const maxValue = Math.max(...sorted.map((row) => (measure === "pesos" ? row.pesos ?? 0 : row.projects)), 0);

  if (sorted.length === 0 || maxValue === 0) {
    return <p className="text-base text-pa-ink-2">{t.chart.emptyChart}</p>;
  }

  return (
    <div>
      <ul className="space-y-3">
        {visible.map((row) => {
          const value = measure === "pesos" ? row.pesos ?? 0 : row.projects;
          const width = `${(value / maxValue) * 100}%`;
          const selected = selectedKey === row.key;
          const content = (
            <>
              <span className={cn("block text-base leading-snug", selected ? "font-semibold text-pa-ink" : "text-pa-ink")}>{row.label}</span>
              <span className="mt-1 flex items-center gap-2" aria-hidden="true">
                <span className="relative block h-5 flex-1">
                  <span
                    className="absolute inset-y-0 left-0 block rounded-r"
                    style={{ width: value > 0 ? `max(${width}, 2px)` : "0", background: color }}
                  />
                </span>
              </span>
            </>
          );
          return (
            <li key={row.key} className="grid grid-cols-[1fr_auto] items-end gap-x-3">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(row.key)}
                  aria-pressed={selected}
                  aria-label={selectLabel ? selectLabel(row) : undefined}
                  className={cn("min-h-11 w-full rounded px-1 text-left", selected ? "bg-pa-accent-soft" : "hover:bg-pa-accent-soft")}
                >
                  {content}
                </button>
              ) : (
                <div className="px-1">{content}</div>
              )}
              <span className="pb-0.5 text-base font-medium text-pa-ink">
                <span className="sr-only">{row.label}: </span>
                {valueLabel(row, measure)}
              </span>
            </li>
          );
        })}
      </ul>
      {limit && sorted.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 min-h-11 rounded px-1 text-base font-medium text-pa-accent underline-offset-4 hover:underline"
        >
          {expanded ? t.area.showFewer : t.area.showAll.replace("{count}", String(sorted.length))}
        </button>
      ) : null}
    </div>
  );
}

/** Columns by year; value labels sit above each column. */
export function Columns({ rows, measure, color = "var(--series)" }: { rows: ChartRow[]; measure: Measure; color?: string }) {
  const maxValue = Math.max(...rows.map((row) => (measure === "pesos" ? row.pesos ?? 0 : row.projects)), 0);
  if (rows.length === 0 || maxValue === 0) {
    return <p className="text-base text-pa-ink-2">{t.chart.emptyChart}</p>;
  }
  const narrow = rows.length > 8;
  return (
    <div className="w-full" role="img" aria-label={rows.map((row) => `${row.label}: ${valueLabel(row, measure)}`).join(", ")}>
      <div className="flex h-56 items-end gap-1 border-b border-pa-axis sm:gap-2" aria-hidden="true">
        {rows.map((row) => {
          const value = measure === "pesos" ? row.pesos ?? 0 : row.projects;
          return (
            <div key={row.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span
                className={cn("mb-1 whitespace-nowrap text-xs font-medium text-pa-ink sm:text-sm", narrow && "max-sm:[writing-mode:vertical-rl] max-sm:rotate-180")}
              >
                {valueLabel(row, measure)}
              </span>
              <span
                className="block w-full max-w-6 rounded-t"
                style={{ height: `${(value / maxValue) * 80}%`, minHeight: value > 0 ? 2 : 0, background: color }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-2" aria-hidden="true">
        {rows.map((row, index) => (
          <span key={row.key} className="min-w-0 flex-1 text-center text-xs tabular-nums text-pa-muted sm:text-sm">
            {narrow && index % 2 === 1 ? <span className="max-sm:invisible">{row.label}</span> : row.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarChartCard({
  title,
  description,
  rows,
  measures = ["projects"],
  layout = "horizontal",
  limit,
  labelHeader,
  children,
}: {
  title: string;
  description?: ReactNode;
  rows: ChartRow[];
  measures?: Measure[];
  layout?: "horizontal" | "columns";
  limit?: number;
  labelHeader?: string;
  children?: ReactNode;
}) {
  const [measure, setMeasure] = useState<Measure>(measures[0]);
  return (
    <Section title={title} description={description}>
      {measures.length > 1 ? (
        <div className="mb-4">
          <MeasureToggle value={measure} onChange={setMeasure} label={t.chart.measure} />
        </div>
      ) : null}
      {layout === "columns" ? <Columns rows={rows} measure={measure} /> : <HorizontalBars rows={rows} measure={measure} limit={limit} />}
      {children}
      <DataTable rows={rows} showPesos={measures.includes("pesos")} labelHeader={labelHeader} />
    </Section>
  );
}

import type { ReactNode } from "react";

export function ChartPanel({ title, description, summary, children }: { title: string; description: string; summary: string; children: ReactNode }) {
  const id = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 id={id} className="text-base font-extrabold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      <p className="sr-only">{summary}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartEmptyState() {
  return <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No data available for the current filters.</div>;
}

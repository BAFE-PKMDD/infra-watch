import type { ReactNode } from "react";

export function ChartPanel({ title, description, summary, children }: { title: string; description: string; summary: string; children: ReactNode }) {
  const id = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 id={id} className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      <p className="sr-only">{summary}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartEmptyState({
  title = "No data available for the current filters.",
  detail,
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center dark:border-slate-700">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
      {detail && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

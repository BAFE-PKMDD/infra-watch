import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  valueTitle,
  definition,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  valueTitle?: string;
  definition: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900",
        tone === "critical"
          ? "border-red-200 dark:border-red-900/70"
          : tone === "warning"
            ? "border-amber-200 dark:border-amber-900/70"
            : "border-slate-200 dark:border-slate-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {icon && <span aria-hidden="true" className="text-primary">{icon}</span>}
      </div>
      <p title={valueTitle} className={cn("mt-3 text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white", tone === "critical" && "text-red-700 dark:text-red-300", tone === "warning" && "text-amber-700 dark:text-amber-300")}>{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>}
      <details className="group mt-2 text-xs text-slate-600 dark:text-slate-300">
        <summary className="cursor-pointer font-bold text-slate-500 outline-none marker:text-slate-400 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-slate-400">
          Metric definition
        </summary>
        <p className="mt-1.5 leading-5">{definition}</p>
      </details>
    </article>
  );
}

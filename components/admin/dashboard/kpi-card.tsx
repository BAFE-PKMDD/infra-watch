import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  definition,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
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
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400" title={definition}>
          {label}
          <span className="sr-only">. Definition: {definition}</span>
        </p>
        {icon && <span aria-hidden="true" className="text-primary">{icon}</span>}
      </div>
      <p className={cn("mt-3 text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white", tone === "critical" && "text-red-700 dark:text-red-300", tone === "warning" && "text-amber-700 dark:text-amber-300")}>{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>}
    </article>
  );
}

"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      data-primary-kpi={label}
      className={cn(
        "min-w-0 rounded-md border bg-white p-4 dark:bg-slate-900",
        tone === "critical"
          ? "border-red-300 dark:border-red-900/70"
          : tone === "warning"
            ? "border-amber-300 dark:border-amber-900/70"
            : "border-slate-200 dark:border-slate-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            {label}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label={`${label} definition`}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-slate-400 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Info className="size-3.5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">{definition}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {icon && <span aria-hidden="true" className={cn("text-slate-400", tone === "critical" && "text-red-600", tone === "warning" && "text-amber-600")}>{icon}</span>}
      </div>
      <p
        title={valueTitle}
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-[1.75rem] dark:text-white",
          tone === "critical" && "text-red-700 dark:text-red-300",
          tone === "warning" && "text-amber-700 dark:text-amber-300",
        )}
      >
        {valueTitle ? (
          <>
            <span aria-hidden="true">{value}</span>
            <span className="sr-only">Exact value: {valueTitle}</span>
          </>
        ) : value}
      </p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>}
    </article>
  );
}

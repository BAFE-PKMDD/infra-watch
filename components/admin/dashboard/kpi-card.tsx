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
  className,
}: {
  label: string;
  value: string;
  valueTitle?: string;
  definition: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "critical" | "info";
  className?: string;
}) {
  return (
    <article
      data-primary-kpi={label}
      className={cn(
        "min-w-0 rounded-md border bg-white p-5 transition-shadow duration-300 hover:shadow-sm dark:bg-slate-900",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none",
        tone === "critical"
          ? "border-slate-200 border-l-[3px] border-l-red-500 dark:border-slate-800 dark:border-l-red-500"
          : tone === "warning"
            ? "border-slate-200 border-l-[3px] border-l-amber-500 dark:border-slate-800 dark:border-l-amber-500"
            : tone === "info"
              ? "border-slate-200 border-l-[3px] border-l-blue-500 dark:border-slate-800 dark:border-l-blue-500"
              : "border-slate-200 dark:border-slate-800",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label={`${label} definition`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-slate-400 outline-none hover:bg-slate-100 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <Info className="size-3" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">{definition}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              tone === "critical"
                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                : tone === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  : tone === "info"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                    : "bg-primary/8 text-primary dark:bg-primary/15",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        title={valueTitle}
        className={cn(
          "mt-3.5 text-[1.75rem] font-bold tracking-tight tabular-nums text-slate-950 sm:text-4xl dark:text-white",
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
      {detail && (
        <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      )}
    </article>
  );
}

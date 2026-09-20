import { Info } from "lucide-react";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChartPanel({
  title,
  description,
  summary,
  headerAction,
  children,
}: {
  title: string;
  description: string;
  summary: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const id = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500 rounded-md border border-slate-200 bg-white transition-shadow hover:shadow-sm motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-1">
          <h2 id={id} className="truncate text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label={`${title}: chart details`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-slate-400 outline-none hover:bg-slate-100 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <Info className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">{description}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {headerAction}
      </div>
      <p className="sr-only">{summary}</p>
      <div className="p-5">{children}</div>
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
    <div className="flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 px-6 py-8 text-center dark:border-slate-700">
      <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {detail && <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

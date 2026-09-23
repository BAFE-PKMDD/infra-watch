import { Check, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const STAGES = ["Received", "Review & tag", "Respond & resolve"];

export function SmsCaseLifecycleStepper({
  currentStep,
  closedLabel,
}: {
  currentStep: 1 | 2 | 3 | null;
  closedLabel?: string;
}) {
  if (closedLabel) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <XCircle aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
        {closedLabel}
      </div>
    );
  }

  return (
    <ol aria-label="Case progress" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {STAGES.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const done = currentStep !== null && step < currentStep;
        const active = step === currentStep;

        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                active ? "bg-primary text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" /> : step}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                active ? "text-slate-950 dark:text-white" : done ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500",
              )}
            >
              {label}
            </span>
            {index < STAGES.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-5 shrink-0 bg-slate-300 sm:w-8 dark:bg-slate-700" />}
          </li>
        );
      })}
    </ol>
  );
}

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";

export function DataCoverage({
  coverage,
}: {
  coverage: ManagerialDashboardData["coverage"];
}) {
  return (
    <section aria-labelledby="data-completeness-heading" className="border-y border-slate-200 py-4 dark:border-slate-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="data-completeness-heading" className="text-base font-semibold text-slate-950 dark:text-white">Data Completeness</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Known values are reported separately from missing data.</p>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <CoverageItem label="Allocated Budget" value={coverage.withBudget} total={coverage.total} />
        <CoverageItem label="Supplier Actual Bid Amount" value={coverage.withActualBidAmount} total={coverage.total} />
        <CoverageItem label="Schedule Dates" value={coverage.withSchedule} total={coverage.total} />
        <CoverageItem label="Physical Progress" value={coverage.withPhysicalProgress} total={coverage.total} />
        <CoverageItem label="Financial Evidence" value={coverage.withFinancialData} total={coverage.total} unavailable />
      </div>
    </section>
  );
}

function CoverageItem({
  label,
  value,
  total,
  unavailable = false,
}: {
  label: string;
  value: number;
  total: number;
  unavailable?: boolean;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
          {value.toLocaleString("en-PH")} of {total.toLocaleString("en-PH")} ({percentage}%)
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label={`${label} completeness`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <div className="h-full rounded-sm bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      {unavailable && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Financial data unavailable pending source confirmation
        </p>
      )}
    </div>
  );
}

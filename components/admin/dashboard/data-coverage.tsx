import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";

export function DataCoverage({
  coverage,
}: {
  coverage: ManagerialDashboardData["coverage"];
}) {
  return (
    <section aria-labelledby="data-coverage-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="data-coverage-heading" className="text-sm font-extrabold text-slate-950 dark:text-white">Data coverage</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Known values are distinct from missing data.</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CoverageItem label="Allocated budget" value={coverage.withBudget} total={coverage.total} />
        <CoverageItem label="Supplier actual bid amount" value={coverage.withActualBidAmount} total={coverage.total} />
        <CoverageItem label="Schedule dates" value={coverage.withSchedule} total={coverage.total} />
        <CoverageItem label="Physical progress" value={coverage.withPhysicalProgress} total={coverage.total} />
        <CoverageItem label="Financial evidence" value={coverage.withFinancialData} total={coverage.total} unavailable />
      </div>
    </section>
  );
}

function CoverageItem({ label, value, total, unavailable = false }: { label: string; value: number; total: number; unavailable?: boolean }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">{value} of {total}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{unavailable ? "Financial data unavailable pending source confirmation" : `${percentage}% coverage`}</p>
    </div>
  );
}

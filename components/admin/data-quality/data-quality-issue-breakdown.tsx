import { ISSUE_LABELS, ISSUE_SEVERITY } from "@/lib/data-quality/format";
import type { DataQualityIssueType, DataQualityReport } from "@/types/data-quality.types";

const SEVERITY_COLOR: Record<"critical" | "warning" | "info", string> = {
  critical: "var(--a-crit, #dc2626)",
  warning: "var(--a-warn, #d97706)",
  info: "var(--a-s3, #2563eb)",
};

const SEVERITY_LABEL: Record<"critical" | "warning" | "info", string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Informational",
};

export function DataQualityIssueBreakdown({ summary }: { summary: DataQualityReport["summary"] }) {
  const totalScanned = summary.totalProjectsScanned;
  const rows = (Object.keys(summary.issueCounts) as DataQualityIssueType[])
    .map((type) => ({
      type,
      count: summary.issueCounts[type],
      severity: ISSUE_SEVERITY[type],
      pct: totalScanned > 0 ? (summary.issueCounts[type] / totalScanned) * 100 : 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <section
      aria-labelledby="quality-breakdown-title"
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--a-hair)", background: "var(--a-surface)" }}
    >
      <h2 id="quality-breakdown-title" className="text-base font-semibold text-slate-950 dark:text-white">
        What kind of issues were found
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Share of the {totalScanned.toLocaleString("en-PH")} scanned project{totalScanned === 1 ? "" : "s"} with each finding. A project can appear in more than one row.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No issues were found in the scanned projects.</p>
      ) : (
        <ul className="mt-4 list-none space-y-3 p-0" role="img" aria-label={rows.map((row) => `${ISSUE_LABELS[row.type]}: ${row.count} projects, ${row.pct.toFixed(1)} percent, ${SEVERITY_LABEL[row.severity]}`).join("; ")}>
          {rows.map((row) => (
            <li key={row.type} aria-hidden="true">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">{ISSUE_LABELS[row.type]}</span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                  {row.count.toLocaleString("en-PH")} &middot; {row.pct.toFixed(1)}%
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full"
                style={{ background: "var(--a-surface-2)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(row.pct, row.count > 0 ? 1.5 : 0))}%`, background: SEVERITY_COLOR[row.severity] }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

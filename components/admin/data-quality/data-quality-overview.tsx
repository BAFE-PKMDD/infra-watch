import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataQualityReport } from "@/types/data-quality.types";

const ISSUE_LABELS = {
  missing_approved_budget: "Missing approved budget",
  missing_actual_bid_amount: "Missing supplier bid amount",
  bid_exceeds_approved_budget: "Bid exceeds approved budget",
  missing_location: "Missing location",
  invalid_coordinates: "Invalid coordinates",
  duplicate_project_code: "Duplicate project code",
  stale_source_record: "Not seen in latest successful sync",
} as const;

export function DataQualityOverview({ report }: { report: DataQualityReport }) {
  const { summary } = report;

  return (
    <div className="space-y-6">
      <section aria-labelledby="data-quality-summary" className="space-y-3">
        <div>
          <h2 id="data-quality-summary" className="text-base font-extrabold text-slate-950 dark:text-white">Quality overview</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Financial rules use <strong>Approved budget</strong> for allocated amount and <strong>Supplier actual bid amount</strong> for ABC.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Project counts are unique records. Finding counts are detected issues, and one project can have multiple findings.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Projects scanned" value={summary.totalProjectsScanned} tone="neutral" />
          <SummaryCard label="Projects with findings" value={summary.projectsWithFindings} tone="neutral" />
          <SummaryCard label="Total findings" value={summary.totalIssues} tone="neutral" />
          <SummaryCard label="Critical findings" value={summary.critical} tone="critical" />
          <SummaryCard label="Warning findings" value={summary.warning} tone="warning" />
          <SummaryCard label="Informational findings" value={summary.info} tone="info" />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30" aria-labelledby="cleanup-preview-title">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="cleanup-preview-title" className="font-extrabold text-amber-950 dark:text-amber-100">Cleanup candidates</h2>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:bg-amber-900 dark:text-amber-100">Preview only</span>
            </div>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {summary.cleanupCandidateCount.toLocaleString("en-PH")} records were not observed in the latest successful source sync. These are included in the warning findings above. This is a recommendation only. No record is cleaned, changed, archived, or removed by Data Quality.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="quality-issues-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="quality-issues-title" className="text-base font-extrabold text-slate-950 dark:text-white">Detected issues</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Review each recommendation against authoritative source evidence. This report cannot change project records.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">View only</span>
        </div>

        {report.issues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <CheckCircle2 className="size-5" />
            No issues match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Findings and recommendations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.issues.map((row) => (
                  <TableRow key={row.project.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      <Link href={`/projects/${encodeURIComponent(row.project.abemisId)}`} className="font-extrabold text-slate-950 hover:text-primary dark:text-white">
                        {row.project.name}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-slate-500">{row.project.projectCode ?? row.project.abemisId}</p>
                    </TableCell>
                    <TableCell className="min-w-[32rem] whitespace-normal">
                      <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {row.findings.map((finding) => (
                          <div key={`${finding.type}-${finding.field}`} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start gap-2">
                              <SeverityIcon severity={finding.severity} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-bold">{ISSUE_LABELS[finding.type]}</p>
                                  <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    Current: {formatCurrentValue(finding.currentValue)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{finding.message}</p>
                                <p className="mt-2 text-xs text-slate-800 dark:text-slate-100">
                                  <strong>Recommendation:</strong> {finding.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value?: number | null; tone: "neutral" | "critical" | "warning" | "info" }) {
  const toneClass = {
    neutral: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    critical: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
    info: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
        {typeof value === "number" ? value.toLocaleString("en-PH") : "Unavailable"}
      </p>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") return <AlertTriangle aria-label="Critical" className="mt-0.5 size-4 shrink-0 text-red-600" />;
  if (severity === "warning") return <AlertTriangle aria-label="Warning" className="mt-0.5 size-4 shrink-0 text-amber-600" />;
  return <Info aria-label="Information" className="mt-0.5 size-4 shrink-0 text-blue-600" />;
}

function formatCurrentValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Missing";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { KpiCard } from "@/components/admin/dashboard/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ISSUE_LABELS, formatFindingCurrentValue } from "@/lib/data-quality/format";
import type { DataQualityReport } from "@/types/data-quality.types";

export function DataQualityOverview({ report }: { report: DataQualityReport }) {
  const { summary } = report;

  return (
    <div className="space-y-6">
      <section aria-labelledby="data-quality-summary" className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 id="data-quality-summary" className="sr-only">Quality overview</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Critical findings"
            value={formatSummaryValue(summary.critical)}
            definition="Findings that block reliable reporting, such as a missing approved budget. Review these first."
            icon={<AlertTriangle className="size-4" />}
            tone="critical"
          />
          <KpiCard
            label="Warning findings"
            value={formatSummaryValue(summary.warning)}
            definition="Findings that may affect accuracy, such as a bid over budget or unverified coordinates."
            icon={<AlertTriangle className="size-4" />}
            tone="warning"
          />
          <KpiCard
            label="Informational findings"
            value={formatSummaryValue(summary.info)}
            definition="Findings that may be expected, such as a bid amount not yet available before bidding closes."
            icon={<Info className="size-4" />}
            tone="info"
          />
        </div>
      </section>

      <section aria-labelledby="quality-issues-title" className="space-y-3">
        <h2 id="quality-issues-title" className="sr-only">Detected issues</h2>

        {report.issues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 border-l-[3px] border-l-emerald-500 bg-white p-5 text-sm text-slate-700 dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-900 dark:text-slate-200">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            No issues match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Findings</TableHead>
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
                    <TableCell className="min-w-[24rem] whitespace-normal">
                      <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {row.findings.map((finding) => (
                          <div key={`${finding.type}-${finding.field}`} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <SeverityIcon severity={finding.severity} />
                              <span className="truncate text-sm font-bold">{ISSUE_LABELS[finding.type]}</span>
                            </span>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              Current: {formatFindingCurrentValue(finding.type, finding.currentValue)}
                            </span>
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

function formatSummaryValue(value?: number | null) {
  return typeof value === "number" ? value.toLocaleString("en-PH") : "Unavailable";
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") return <AlertTriangle aria-label="Critical" className="mt-0.5 size-4 shrink-0 text-red-600" />;
  if (severity === "warning") return <AlertTriangle aria-label="Warning" className="mt-0.5 size-4 shrink-0 text-amber-600" />;
  return <Info aria-label="Information" className="mt-0.5 size-4 shrink-0 text-blue-600" />;
}

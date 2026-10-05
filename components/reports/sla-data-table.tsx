"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SlaTableRow } from "@/types/reports.types";
import { formatReportTimestamp, formatSlaDuration, slaStatus } from "@/lib/reports/format";

function getSlaColor(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 4) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (hours < 24) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (hours < 72) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function SlaDataTable({ data }: { data: SlaTableRow[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <p className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300">Dates use Asia/Manila. SLA status is assessed when the report is generated. Scroll horizontally for all columns.</p>
      <Table className="min-w-[900px]" scrollRegionLabel="Response report table; scroll horizontally for all columns">
        <TableHeader className="bg-slate-50 dark:bg-slate-900">
          <TableRow>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reference</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Submitted</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">First staff response</TableHead>
            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Response time</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">SLA status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-600 dark:text-slate-300">
                No data available for the selected period.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <TableCell className="font-medium text-slate-950 dark:text-white">
                  <div className="flex flex-col">
                    <span className="max-w-[200px] truncate">{row.referenceId}</span>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-300">{row.id.slice(0, 8)}</span>
                      {row.category && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">· {row.category}</span>
                      )}
                      {row.farmOperation && (
                        <span className="text-slate-600 dark:text-slate-300">({row.farmOperation})</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="px-2 text-xs capitalize">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {formatReportTimestamp(row.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {row.firstResponseAt ? formatReportTimestamp(row.firstResponseAt) : "Unavailable"}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                      getSlaColor(row.responseTimeMs),
                    )}
                  >
                    {formatSlaDuration(row.responseTimeMs)}
                  </span>
                </TableCell>
                <TableCell className={cn("text-sm font-medium", row.isSlaBreach ? "text-red-700 dark:text-red-300" : "text-slate-700 dark:text-slate-300")}>{slaStatus(row)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SyncLog } from "@/types/sync.types";

function formatDate(value: Date | string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 className="size-4 animate-spin text-blue-600" />;
  if (status === "failed") return <AlertCircle className="size-4 text-red-600" />;
  return <CheckCircle2 className="size-4 text-emerald-600" />;
}

export function SyncLogsTable({ logs }: { logs: SyncLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No sync logs yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Added</TableHead>
            <TableHead className="text-right">Updated</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead className="text-right">Processed</TableHead>
            <TableHead>Finished</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs font-bold capitalize dark:border-slate-800">
                  <StatusIcon status={log.status} />
                  {log.status}
                </span>
              </TableCell>
              <TableCell className="font-semibold capitalize">{log.syncType}</TableCell>
              <TableCell className="text-right font-mono">{log.projectsAdded}</TableCell>
              <TableCell className="text-right font-mono">{log.projectsUpdated}</TableCell>
              <TableCell className="text-right font-mono">{log.projectsFailed}</TableCell>
              <TableCell className="text-right font-mono">{log.totalProcessed}</TableCell>
              <TableCell>{formatDate(log.completedAt ?? log.startedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

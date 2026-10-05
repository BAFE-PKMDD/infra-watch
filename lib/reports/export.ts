import { formatReportTimestamp, formatSlaDuration, slaStatus } from "./format";
import type { SlaTableRow } from "@/types/reports.types";

export function buildSlaCsv(data: SlaTableRow[]): string {
  const headers = ["ID", "Reference", "Status", "Category", "Farm Operation", "Submitted (Asia/Manila)", "First staff response (Asia/Manila)", "Response time (ms)", "SLA breach", "SLA status"];
  const rows = data.map((item) => [
    item.id, item.referenceId, item.status, item.category || "Not classified", item.farmOperation || "Not classified",
    formatReportTimestamp(item.createdAt),
    item.firstResponseAt ? formatReportTimestamp(item.firstResponseAt) : "Unavailable",
    item.responseTimeMs == null ? "Unavailable" : String(item.responseTimeMs),
    item.isSlaBreach ? "Yes" : "No",
    slaStatus(item),
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function buildSlaPdfRows(data: SlaTableRow[]): string[][] {
  return data.map((item) => [
    item.referenceId, item.status, item.category || "Not classified", item.farmOperation || "Not classified",
    formatReportTimestamp(item.createdAt),
    item.firstResponseAt ? formatReportTimestamp(item.firstResponseAt) : "Unavailable",
    formatSlaDuration(item.responseTimeMs),
    slaStatus(item),
  ]);
}

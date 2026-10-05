import { REPORT_TIME_ZONE } from "./date-range";
import type { SlaTableRow } from "@/types/reports.types";

export function formatSlaDuration(ms: number | null | undefined): string {
  if (ms == null) return "Unavailable";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

const timestampFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function formatReportTimestamp(date: Date): string {
  const parts = Object.fromEntries(timestampFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function slaStatus(row: SlaTableRow): string {
  if (row.isSlaBreach) return "Breached";
  return row.responseTimeMs == null ? "Awaiting staff response" : "Within SLA";
}

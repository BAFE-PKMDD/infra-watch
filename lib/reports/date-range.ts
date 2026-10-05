export const REPORT_TIME_ZONE = "Asia/Manila";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function reportDay(date: Date): string {
  return dayFormatter.format(date);
}

export function addReportDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getReportPreset(days: number, now = new Date()) {
  const to = reportDay(now);
  return { from: addReportDays(to, 1 - days), to };
}

type DateInput = string | Date | null;
export type ReportRangeInput = { from?: DateInput; to?: DateInput };
export type ReportRange = { from: string; to: string; start: Date; endExclusive: Date };

function parseDay(value: DateInput | undefined, fallback: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return value;
  } else {
    // Accept saved links using the previous ISO timestamp format.
    const parsed = value instanceof Date ? value : /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return reportDay(parsed);
  }
  throw new Error("Report dates must be valid calendar dates.");
}

export function parseReportRange(input: ReportRangeInput = {}, now = new Date()): ReportRange {
  const to = parseDay(input.to, reportDay(now));
  const from = parseDay(input.from, addReportDays(to, -29));
  if (from > to) throw new Error("The from date must be on or before the to date.");
  return {
    from,
    to,
    start: new Date(`${from}T00:00:00+08:00`),
    endExclusive: new Date(`${addReportDays(to, 1)}T00:00:00+08:00`),
  };
}

// Calendar controls use local dates so their labels stay correct in any browser timezone.
export function reportRangeToCalendar(range: Pick<ReportRange, "from" | "to">) {
  return { from: new Date(`${range.from}T00:00:00`), to: new Date(`${range.to}T00:00:00`) };
}

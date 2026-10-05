import { SLA_BREACH_HOURS } from "@/lib/sla-thresholds";
import { addReportDays, reportDay, type ReportRange } from "./date-range";
import type { SlaDistribution, SlaReportData, SlaTableRow, SlaTier } from "@/types/reports.types";

const HOUR_MS = 3_600_000;
const SYSTEM_AUTO_ACTOR_ID = "system-auto-acceptance";

type IssueRecord = {
  id: string;
  ticketNumber: string;
  status: string;
  category: string;
  farmOperation: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};
type IssueResponseRecord = {
  issueId: string;
  createdAt: Date;
  isInternalOnly: boolean;
  responderId: string;
  responderRole: string | null;
};
type FeedbackRecord = {
  id: string;
  comment: string | null;
  status: string;
  category: string | null;
  createdAt: Date;
  moderatedAt: Date | null;
  moderatedBy: string | null;
};

function duration(createdAt: Date, actedAt: Date | null): number | null {
  if (!actedAt) return null;
  const milliseconds = actedAt.getTime() - createdAt.getTime();
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : null;
}

function isBreach(createdAt: Date, responseTimeMs: number | null, now: Date): boolean {
  const elapsed = responseTimeMs ?? now.getTime() - createdAt.getTime();
  return elapsed > SLA_BREACH_HOURS * HOUR_MS;
}

const TIERS: Array<{ tier: SlaTier; label: string; color: string; upperHours: number }> = [
  { tier: "under_1h", label: "< 1 Hour", color: "#059669", upperHours: 1 },
  { tier: "1h_4h", label: "1-4 Hours", color: "#10b981", upperHours: 4 },
  { tier: "4h_24h", label: "4-24 Hours", color: "#34d399", upperHours: 24 },
  { tier: "1d_3d", label: "1-3 Days", color: "#fbbf24", upperHours: 72 },
  { tier: "3d_7d", label: "3-7 Days", color: "#f59e0b", upperHours: 168 },
  { tier: "over_7d", label: "7 Days or More", color: "#ef4444", upperHours: Infinity },
];

function assembleReport(tableData: SlaTableRow[], range: ReportRange): SlaReportData {
  const responseTimes = tableData.flatMap((row) => row.responseTimeMs == null ? [] : [row.responseTimeMs]);
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const resolutionTimes = tableData.flatMap((row) => row.resolutionTimeMs == null ? [] : [row.resolutionTimeMs]);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const distribution: SlaDistribution[] = TIERS.map((tier, index) => {
    const lowerHours = index === 0 ? 0 : TIERS[index - 1].upperHours;
    const count = responseTimes.filter((time) => time / HOUR_MS >= lowerHours && time / HOUR_MS < tier.upperHours).length;
    return {
      tier: tier.tier,
      label: tier.label,
      color: tier.color,
      count,
      percentage: responseTimes.length ? count / responseTimes.length * 100 : 0,
    };
  });

  const dayRows = new Map<string, SlaTableRow[]>();
  for (const row of tableData) {
    const day = reportDay(row.createdAt);
    const rows = dayRows.get(day) ?? [];
    rows.push(row);
    dayRows.set(day, rows);
  }
  const trend: SlaReportData["trend"] = [];
  for (let day = range.from; day <= range.to; day = addReportDays(day, 1)) {
    const rows = dayRows.get(day) ?? [];
    const times = rows.flatMap((row) => row.responseTimeMs == null ? [] : [row.responseTimeMs / HOUR_MS]);
    trend.push({ date: day, avgResponseTime: average(times), itemCount: rows.length });
  }

  return {
    summary: {
      avgResponseTime: average(responseTimes),
      medianResponseTime: sorted.length === 0 ? null : sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
      minResponseTime: sorted[0] ?? null,
      maxResponseTime: sorted.at(-1) ?? null,
      totalItems: tableData.length,
      respondedItems: responseTimes.length,
      resolutionRate: tableData.length ? resolutionTimes.length / tableData.length * 100 : null,
      avgResolutionTime: average(resolutionTimes),
    },
    distribution,
    trend,
    tableData,
  };
}

export function buildIssueSlaReport(records: IssueRecord[], responses: IssueResponseRecord[], range: ReportRange, now = new Date()): SlaReportData {
  const createdByIssue = new Map(records.map((record) => [record.id, record.createdAt]));
  const firstResponseByIssue = new Map<string, Date>();
  for (const response of responses) {
    if (response.isInternalOnly || response.responderRole === "system" || response.responderId === SYSTEM_AUTO_ACTOR_ID) continue;
    const createdAt = createdByIssue.get(response.issueId);
    if (!createdAt || duration(createdAt, response.createdAt) === null) continue;
    const existing = firstResponseByIssue.get(response.issueId);
    if (!existing || response.createdAt < existing) firstResponseByIssue.set(response.issueId, response.createdAt);
  }

  return assembleReport(records.map((issue) => {
    const firstResponseAt = firstResponseByIssue.get(issue.id) ?? null;
    const responseTimeMs = duration(issue.createdAt, firstResponseAt);
    const resolutionTimeMs = duration(issue.createdAt, issue.resolvedAt);
    return {
      id: issue.id,
      referenceId: issue.ticketNumber,
      status: issue.status,
      category: issue.category,
      farmOperation: issue.farmOperation,
      createdAt: issue.createdAt,
      firstResponseAt,
      resolvedAt: resolutionTimeMs === null ? null : issue.resolvedAt,
      responseTimeMs,
      resolutionTimeMs,
      isSlaBreach: isBreach(issue.createdAt, responseTimeMs, now),
    };
  }), range);
}

export function buildFeedbackSlaReport(records: FeedbackRecord[], range: ReportRange, now = new Date()): SlaReportData {
  return assembleReport(records.map((item) => {
    const humanModerationAt = item.moderatedBy && item.moderatedBy !== SYSTEM_AUTO_ACTOR_ID ? item.moderatedAt : null;
    const responseTimeMs = duration(item.createdAt, humanModerationAt);
    const firstResponseAt = responseTimeMs === null ? null : humanModerationAt;
    return {
      id: item.id,
      referenceId: item.comment?.slice(0, 30) || "Feedback",
      status: item.status,
      category: item.category ?? undefined,
      createdAt: item.createdAt,
      firstResponseAt,
      resolvedAt: firstResponseAt,
      responseTimeMs,
      resolutionTimeMs: responseTimeMs,
      isSlaBreach: isBreach(item.createdAt, responseTimeMs, now),
    };
  }), range);
}

"use server";

import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  differenceInMilliseconds,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
} from "date-fns";

import { db } from "@/lib/db";
import { feedback, issueResponses, issues, projects } from "@/lib/db/schema";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { SLA_BREACH_HOURS } from "@/lib/sla-thresholds";
import type {
  SlaDistribution,
  SlaReportData,
  SlaSummary,
  SlaTableRow,
  SlaTier,
  SlaTrendPoint,
} from "@/types/reports.types";

// A response/resolution timestamp earlier than the creation timestamp is a data-quality
// issue (clock skew, a manually corrected record), not a real response — treated as
// "not yet responded" rather than a misleadingly fast negative duration.
function nonNegativeDuration(ms: number): number | null {
  return ms >= 0 ? ms : null;
}

function getSlaTier(durationMs: number): SlaTier {
  const hours = durationMs / (1000 * 60 * 60);
  if (hours < 1) return "under_1h";
  if (hours < 4) return "1h_4h";
  if (hours < 24) return "4h_24h";
  const days = hours / 24;
  if (days < 3) return "1d_3d";
  if (days < 7) return "3d_7d";
  return "over_7d";
}

const SLA_TIER_LABELS: Record<SlaTier, string> = {
  under_1h: "< 1 Hour",
  "1h_4h": "1-4 Hours",
  "4h_24h": "4-24 Hours",
  "1d_3d": "1-3 Days",
  "3d_7d": "3-7 Days",
  over_7d: "> 7 Days",
};

const SLA_TIER_COLORS: Record<SlaTier, string> = {
  under_1h: "#059669", // Emerald 600
  "1h_4h": "#10b981", // Emerald 500
  "4h_24h": "#34d399", // Emerald 400
  "1d_3d": "#fbbf24", // Amber 400
  "3d_7d": "#f59e0b", // Amber 500
  over_7d: "#ef4444", // Red 500
};

function summarize(tableData: SlaTableRow[]): SlaSummary {
  const responded = tableData.filter((row) => row.responseTimeMs !== null && row.responseTimeMs !== undefined);
  const responseTimes = responded.map((row) => row.responseTimeMs!);
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const resolved = tableData.filter((row) => row.resolutionTimeMs !== null && row.resolutionTimeMs !== undefined);

  return {
    avgResponseTime: responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    medianResponseTime: responseTimes.length ? sorted[Math.floor(responseTimes.length / 2)] : 0,
    minResponseTime: responseTimes.length ? sorted[0] : 0,
    maxResponseTime: responseTimes.length ? sorted[sorted.length - 1] : 0,
    totalItems: tableData.length,
    respondedItems: responded.length,
    resolutionRate: tableData.length ? (tableData.filter((row) => row.resolvedAt).length / tableData.length) * 100 : 0,
    avgResolutionTime: resolved.length
      ? resolved.reduce((a, b) => a + b.resolutionTimeMs!, 0) / resolved.length
      : 0,
  };
}

function distributeByTier(tableData: SlaTableRow[]): SlaDistribution[] {
  const responded = tableData.filter((row) => row.responseTimeMs !== null && row.responseTimeMs !== undefined);
  return (Object.keys(SLA_TIER_LABELS) as SlaTier[]).map((tier) => {
    const count = responded.filter((row) => getSlaTier(row.responseTimeMs!) === tier).length;
    return {
      tier,
      label: SLA_TIER_LABELS[tier],
      count,
      percentage: responded.length ? (count / responded.length) * 100 : 0,
      color: SLA_TIER_COLORS[tier],
    };
  });
}

function trendByDay(tableData: SlaTableRow[], from: Date, to: Date): SlaTrendPoint[] {
  const days = eachDayOfInterval({ start: from, end: to });
  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const items = tableData.filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd);
    const withResponse = items.filter((row) => row.responseTimeMs !== null && row.responseTimeMs !== undefined);

    return {
      date: format(day, "MMM dd"),
      avgResponseTime: withResponse.length
        ? withResponse.reduce((a, b) => a + b.responseTimeMs!, 0) / withResponse.length / (1000 * 60 * 60)
        : 0,
      itemCount: items.length,
    };
  });
}

/**
 * Get Issue SLA Report.
 *
 * "First response" is the earliest issue_responses row that isn't internal-only — an
 * internal note isn't something the reporter ever saw, so it shouldn't count as the
 * moment their issue was actually responded to.
 */
export async function getIssueSlaReport(params: { from: Date; to: Date }): Promise<SlaReportData> {
  await requireAdminOrRegionalAdmin();
  const { from, to } = params;

  const rangeIssues = await db
    .select({
      id: issues.id,
      ticketNumber: issues.ticketNumber,
      status: issues.status,
      category: issues.category,
      farmOperation: sql<string | null>`coalesce(${issues.reportedFarmOperation}, ${projects.farmOperation})`,
      createdAt: issues.createdAt,
      resolvedAt: issues.resolvedAt,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(and(gte(issues.createdAt, from), lte(issues.createdAt, to)));

  const issueIds = rangeIssues.map((issue) => issue.id);
  const responses = issueIds.length === 0
    ? []
    : await db
        .select({
          issueId: issueResponses.issueId,
          createdAt: issueResponses.createdAt,
          isInternalOnly: issueResponses.isInternalOnly,
        })
        .from(issueResponses)
        .where(inArray(issueResponses.issueId, issueIds))
        .orderBy(asc(issueResponses.createdAt));

  const firstPublicResponseByIssue = new Map<string, Date>();
  for (const response of responses) {
    if (response.isInternalOnly) continue;
    if (!firstPublicResponseByIssue.has(response.issueId)) {
      firstPublicResponseByIssue.set(response.issueId, response.createdAt);
    }
  }

  const tableData: SlaTableRow[] = rangeIssues.map((issue) => {
    const firstResponseAt = firstPublicResponseByIssue.get(issue.id) ?? null;
    const responseTimeMs = firstResponseAt
      ? nonNegativeDuration(differenceInMilliseconds(firstResponseAt, issue.createdAt))
      : null;
    const resolutionTimeMs = issue.resolvedAt
      ? nonNegativeDuration(differenceInMilliseconds(issue.resolvedAt, issue.createdAt))
      : null;

    return {
      id: issue.id,
      referenceId: issue.ticketNumber,
      status: issue.status,
      category: issue.category,
      farmOperation: issue.farmOperation ?? null,
      createdAt: issue.createdAt,
      firstResponseAt,
      resolvedAt: issue.resolvedAt,
      responseTimeMs,
      resolutionTimeMs,
      isSlaBreach: responseTimeMs !== null && responseTimeMs > SLA_BREACH_HOURS * 60 * 60 * 1000,
    };
  });

  return {
    summary: summarize(tableData),
    distribution: distributeByTier(tableData),
    trend: trendByDay(tableData, from, to),
    tableData,
  };
}

/**
 * Get Feedback SLA Report.
 *
 * "Response" is `moderatedAt` — a real moderator decision — never the automatic
 * "we've logged your report" acknowledgment (`autoAcknowledgedAt`), which is
 * deliberately excluded so this metric can't be gamed by the canned auto-reply.
 */
export async function getFeedbackSlaReport(params: { from: Date; to: Date }): Promise<SlaReportData> {
  await requireAdminOrRegionalAdmin();
  const { from, to } = params;

  const rangeFeedback = await db
    .select({
      id: feedback.id,
      comment: feedback.comment,
      status: feedback.status,
      category: feedback.category,
      createdAt: feedback.createdAt,
      moderatedAt: feedback.moderatedAt,
    })
    .from(feedback)
    .where(and(gte(feedback.createdAt, from), lte(feedback.createdAt, to)));

  const tableData: SlaTableRow[] = rangeFeedback.map((item) => {
    const responseTimeMs = item.moderatedAt
      ? nonNegativeDuration(differenceInMilliseconds(item.moderatedAt, item.createdAt))
      : null;
    return {
      id: item.id,
      referenceId: item.comment?.slice(0, 30) || "Feedback",
      status: item.status,
      category: item.category ?? undefined,
      createdAt: item.createdAt,
      firstResponseAt: item.moderatedAt,
      resolvedAt: item.moderatedAt,
      responseTimeMs,
      isSlaBreach: responseTimeMs !== null && responseTimeMs > SLA_BREACH_HOURS * 60 * 60 * 1000,
    };
  });

  return {
    summary: summarize(tableData),
    distribution: distributeByTier(tableData),
    trend: trendByDay(tableData, from, to),
    tableData,
  };
}

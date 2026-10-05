"use server";

import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { feedback, issueResponses, issues, projects } from "@/lib/db/schema";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { parseReportRange, type ReportRangeInput } from "@/lib/reports/date-range";
import { buildFeedbackSlaReport, buildIssueSlaReport } from "@/lib/reports/sla";
import type { SlaReportData } from "@/types/reports.types";

/**
 * Get Issue SLA Report.
 *
 * First response is the earliest valid public staff reply.
 * Internal notes and automated acceptance messages do not count.
 */
export async function getIssueSlaReport(params: ReportRangeInput): Promise<SlaReportData> {
  await requireAdminOrRegionalAdmin();
  const range = parseReportRange(params);

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
    .where(and(gte(issues.createdAt, range.start), lt(issues.createdAt, range.endExclusive)));

  const issueIds = rangeIssues.map((issue) => issue.id);
  const responses = issueIds.length === 0
    ? []
    : await db
        .select({
          issueId: issueResponses.issueId,
          createdAt: issueResponses.createdAt,
          isInternalOnly: issueResponses.isInternalOnly,
          responderId: issueResponses.responderId,
          responderRole: issueResponses.responderRole,
        })
        .from(issueResponses)
        .where(inArray(issueResponses.issueId, issueIds));

  return buildIssueSlaReport(rangeIssues, responses, range);
}

/**
 * Get Feedback SLA Report.
 *
 * Response is an attributed staff moderation decision. Automatic acceptance and
 * acknowledgment timestamps do not count as a human response.
 */
export async function getFeedbackSlaReport(params: ReportRangeInput): Promise<SlaReportData> {
  await requireAdminOrRegionalAdmin();
  const range = parseReportRange(params);

  const rangeFeedback = await db
    .select({
      id: feedback.id,
      comment: feedback.comment,
      status: feedback.status,
      category: feedback.category,
      createdAt: feedback.createdAt,
      moderatedAt: feedback.moderatedAt,
      moderatedBy: feedback.moderatedBy,
    })
    .from(feedback)
    .where(and(gte(feedback.createdAt, range.start), lt(feedback.createdAt, range.endExclusive)));

  return buildFeedbackSlaReport(rangeFeedback, range);
}

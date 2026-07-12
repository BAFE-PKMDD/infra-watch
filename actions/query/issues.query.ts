"use server";

import { db } from "@/lib/db";
import { issueResponses, issues, projects } from "@/lib/db/schema";
import { ensureIssueResponsesTable, normalizeIssueStatus } from "@/lib/admin-issues";
import { requireAuth } from "@/lib/session";
import { desc, eq, inArray, sql } from "drizzle-orm";

export type MyIssueItem = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  issueType: string;
  issueDescription: string;
  dateNoticed: Date;
  status: "pending" | "reviewing" | "resolved" | "closed";
  photoUrls: string[];
  videoUrls: string[];
  documentUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  responseCount: number;
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export async function getMyIssues(): Promise<{
  success: boolean;
  data: MyIssueItem[];
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const rows = await db
      .select({
        id: issues.id,
        ticketNumber: issues.ticketNumber,
        projectId: issues.projectId,
        category: issues.category,
        status: issues.status,
        description: issues.description,
        region: issues.region,
        province: issues.province,
        municipality: issues.municipality,
        barangay: issues.barangay,
        landmark: issues.landmark,
        evidence: issues.evidence,
        resolvedAt: issues.resolvedAt,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
        projectUuid: projects.id,
        projectAbemisId: projects.abemisId,
        projectCode: projects.projectCode,
        projectName: projects.name,
      })
      .from(issues)
      .leftJoin(projects, eq(projects.abemisId, issues.projectId))
      .where(eq(issues.reporterUserId, user.id))
      .orderBy(desc(issues.createdAt));

    await ensureIssueResponsesTable();

    const issueIds = rows.map((row) => row.id);
    const responseCounts =
      issueIds.length > 0
        ? await db
            .select({
              issueId: issueResponses.issueId,
              value: sql<number>`count(*)`,
            })
            .from(issueResponses)
            .where(inArray(issueResponses.issueId, issueIds))
            .groupBy(issueResponses.issueId)
        : [];

    const responseCountByIssue = new Map(
      responseCounts.map((row) => [row.issueId, Number(row.value ?? 0)]),
    );

    return {
      success: true,
      data: rows.map((row) => {
        const evidence = Array.isArray(row.evidence) ? row.evidence : [];
        const projectId = row.projectAbemisId ?? row.projectCode ?? row.projectUuid ?? row.projectId ?? row.id;
        const projectCode = row.projectCode ?? row.projectAbemisId ?? row.projectUuid ?? row.projectId ?? row.id;

        return {
          id: row.id,
          ticketNumber: row.ticketNumber,
          projectId: row.projectId,
          region: row.region ?? "",
          province: row.province ?? "",
          city: row.municipality ?? "",
          barangay: row.barangay ?? "",
          streetLandmark: row.landmark ?? "",
          issueType: row.category,
          issueDescription: row.description,
          dateNoticed: row.createdAt,
          status: normalizeIssueStatus(row.status),
          photoUrls: evidence
            .filter((item) => item.type === "image")
            .map((item) => item.url),
          videoUrls: evidence
            .filter((item) => item.type === "video")
            .map((item) => item.url),
          documentUrls: evidence
            .filter((item) => item.type === "document")
            .map((item) => item.url),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          resolvedAt: row.resolvedAt,
          responseCount: responseCountByIssue.get(row.id) ?? 0,
          project: row.projectName
            ? {
                id: projectId,
                name: row.projectName,
                code: projectCode,
              }
            : null,
        };
      }),
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch issues",
    };
  }
}

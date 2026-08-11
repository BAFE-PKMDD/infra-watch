import { and, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, syncLogs } from "@/lib/db/schema";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";
import {
  analyzeProjectDataQuality,
  type DataQualityIssue,
  type DataQualityIssueType,
  DATA_QUALITY_ISSUE_TYPES,
  isStaleSourceRecord,
} from "./project-quality";

const PROJECT_SELECTION = {
  id: projects.id,
  abemisId: projects.abemisId,
  projectCode: projects.projectCode,
  name: projects.name,
  status: projects.status,
  budget: projects.budget,
  abc: projects.abc,
  region: projects.region,
  province: projects.province,
  municipality: projects.municipality,
  barangay: projects.barangay,
  latitude: projects.latitude,
  longitude: projects.longitude,
  lastSyncedAt: projects.lastSyncedAt,
} as const;

export type DataQualityIssueRow = {
  project: {
    id: string;
    abemisId: string;
    projectCode: string | null;
    name: string;
    status: string;
    budget: string | null;
    abc: number | null;
    region: string | null;
    province: string | null;
    municipality: string | null;
    barangay: string | null;
    latitude: number | null;
    longitude: number | null;
    lastSyncedAt: Date;
  };
  findings: DataQualityIssue[];
};

type FlatDataQualityIssueRow = {
  project: DataQualityIssueRow["project"];
  issue: DataQualityIssue;
};

export type DataQualityReport = {
  summary: {
    totalProjectsScanned: number;
    projectsWithFindings: number;
    totalIssues: number;
    critical: number;
    warning: number;
    info: number;
    cleanupCandidateCount: number;
    latestSuccessfulSyncStartedAt: Date | null;
    issueCounts: Record<DataQualityIssueType, number>;
  };
  issues: DataQualityIssueRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  cleanupExecutionEnabled: false;
};

export async function getDataQualityReport(
  params: { type?: string; search?: string; page?: number; pageSize?: number },
  user: ScopedUser,
): Promise<DataQualityReport> {
  const page = Math.max(1, Number.isFinite(params.page) ? Number(params.page) : 1);
  const pageSize = Math.min(100, Math.max(10, Number.isFinite(params.pageSize) ? Number(params.pageSize) : 25));
  const type = DATA_QUALITY_ISSUE_TYPES.includes(params.type as DataQualityIssueType)
    ? params.type as DataQualityIssueType
    : undefined;
  const conditions = getProjectScopeConditions(user);
  const search = params.search?.trim().slice(0, 160);
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      ilike(projects.name, pattern),
      ilike(projects.abemisId, pattern),
      ilike(projects.projectCode, pattern),
    )!);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [projectRows, latestSuccessfulSyncRows] = await Promise.all([
    db.select(PROJECT_SELECTION).from(projects).where(whereClause).orderBy(sql`${projects.updatedAt} desc`),
    db
      .select({ startedAt: syncLogs.startedAt })
      .from(syncLogs)
      .where(and(eq(syncLogs.resource, "project"), eq(syncLogs.status, "completed")))
      .orderBy(sql`${syncLogs.startedAt} desc`)
      .limit(1),
  ]);
  const latestSuccessfulSyncStartedAt = latestSuccessfulSyncRows[0]?.startedAt ?? null;

  const projectCodeCounts = new Map<string, number>();
  for (const project of projectRows) {
    const code = project.projectCode?.trim().toLowerCase();
    if (code) projectCodeCounts.set(code, (projectCodeCounts.get(code) ?? 0) + 1);
  }

  const allIssues: FlatDataQualityIssueRow[] = [];
  for (const project of projectRows) {
    const issues = analyzeProjectDataQuality(project);
    const code = project.projectCode?.trim().toLowerCase();
    if (code && (projectCodeCounts.get(code) ?? 0) > 1) {
      issues.push({
        type: "duplicate_project_code",
        severity: "critical",
        field: "projectCode",
        currentValue: project.projectCode,
        message: "The project code is used by more than one local project record.",
        recommendation: "Compare the matching records against the authoritative source and verify whether the code or record identity needs correction.",
      });
    }
    if (isStaleSourceRecord(project.lastSyncedAt, latestSuccessfulSyncStartedAt)) {
      issues.push({
        type: "stale_source_record",
        severity: "warning",
        field: "source",
        currentValue: project.lastSyncedAt,
        message: "This record was not observed during the latest successful ABEMIS synchronization.",
        recommendation: "Verify the record against the authoritative source. Do not archive or delete it solely because it was absent from one synchronization.",
      });
    }

    for (const issue of issues) allIssues.push({ project, issue });
  }

  const issueCounts = Object.fromEntries(DATA_QUALITY_ISSUE_TYPES.map((issueType) => [issueType, 0])) as Record<DataQualityIssueType, number>;
  for (const row of allIssues) issueCounts[row.issue.type] += 1;
  const filtered = type ? allIssues.filter((row) => row.issue.type === type) : allIssues;
  const grouped = new Map<string, DataQualityIssueRow>();
  for (const row of filtered) {
    const existing = grouped.get(row.project.id);
    if (existing) {
      existing.findings.push(row.issue);
    } else {
      grouped.set(row.project.id, { project: row.project, findings: [row.issue] });
    }
  }
  const groupedProjects = Array.from(grouped.values());
  const offset = (page - 1) * pageSize;

  return {
    summary: {
      totalProjectsScanned: projectRows.length,
      projectsWithFindings: new Set(allIssues.map((row) => row.project.id)).size,
      totalIssues: allIssues.length,
      critical: allIssues.filter((row) => row.issue.severity === "critical").length,
      warning: allIssues.filter((row) => row.issue.severity === "warning").length,
      info: allIssues.filter((row) => row.issue.severity === "info").length,
      cleanupCandidateCount: issueCounts.stale_source_record,
      latestSuccessfulSyncStartedAt,
      issueCounts,
    },
    issues: groupedProjects.slice(offset, offset + pageSize),
    pagination: {
      page,
      pageSize,
      totalCount: groupedProjects.length,
      totalPages: Math.ceil(groupedProjects.length / pageSize),
    },
    cleanupExecutionEnabled: false,
  };
}

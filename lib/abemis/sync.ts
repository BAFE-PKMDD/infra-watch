import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, syncLogs } from "@/lib/db/schema";
import { fetchAllInfraProjects } from "@/lib/abemis/client";
import { transformAbemisProject } from "@/lib/abemis/transform";

type SyncType = "manual" | "scheduled" | "incremental";

export interface SyncOptions {
  syncType?: SyncType;
  triggeredBy?: string;
  onProgress?: (current: number, total: number, status: string) => void;
}

export interface SyncResult {
  success: boolean;
  syncLogId: string;
  statistics: {
    projectsAdded: number;
    projectsUpdated: number;
    projectsFailed: number;
    totalProcessed: number;
  };
  duration: number;
  errors: Array<{ projectId: string; message: string }>;
}

export async function syncAbemisProjects(options: SyncOptions = {}): Promise<SyncResult> {
  const { syncType = "manual", triggeredBy = "system", onProgress } = options;
  const startTime = Date.now();
  const errors: Array<{ projectId: string; message: string }> = [];

  const [syncLog] = await db
    .insert(syncLogs)
    .values({
      syncType,
      resource: "project",
      status: "running",
      triggeredBy,
      startedAt: new Date(),
    })
    .returning();

  let projectsAdded = 0;
  let projectsUpdated = 0;
  let projectsFailed = 0;
  let totalProcessed = 0;

  try {
    onProgress?.(0, 0, "Starting ABEMIS sync...");

    const sourceProjects = await fetchAllInfraProjects((current, total) => {
      onProgress?.(current, total, `Fetching page ${current} of ${total} from ABEMIS`);
    });

    const uniqueProjects = Array.from(
      new Map(sourceProjects.map((project) => [project.project_id || project.id, project])).values(),
    );

    const sourceIds = uniqueProjects.map((project) => project.project_id || project.id);
    const existingRows = sourceIds.length
      ? await db
          .select({ sourceProjectId: projects.sourceProjectId })
          .from(projects)
          .where(inArray(projects.sourceProjectId, sourceIds))
      : [];
    const existingIds = new Set(existingRows.map((row) => row.sourceProjectId));

    const chunkSize = 250;

    for (let index = 0; index < uniqueProjects.length; index += chunkSize) {
      const chunk = uniqueProjects.slice(index, index + chunkSize);
      const values = [];

      for (const sourceProject of chunk) {
        const sourceProjectId = sourceProject.project_id || sourceProject.id;

        try {
          const transformed = transformAbemisProject(sourceProject);
          values.push({
            ...transformed,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          });

          if (existingIds.has(sourceProjectId)) {
            projectsUpdated += 1;
          } else {
            projectsAdded += 1;
          }
        } catch (error) {
          projectsFailed += 1;
          errors.push({
            projectId: sourceProjectId,
            message: error instanceof Error ? error.message : "Transformation failed",
          });
        }
      }

      if (values.length > 0) {
        await db
          .insert(projects)
          .values(values)
          .onConflictDoUpdate({
            target: projects.sourceProjectId,
            set: {
              projectCode: sql`excluded.project_code`,
              name: sql`excluded.name`,
              description: sql`excluded.description`,
              program: sql`excluded.program`,
              subProgram: sql`excluded.sub_program`,
              projectType: sql`excluded.project_type`,
              status: sql`excluded.status`,
              stage: sql`excluded.stage`,
              region: sql`excluded.region`,
              province: sql`excluded.province`,
              municipality: sql`excluded.municipality`,
              barangay: sql`excluded.barangay`,
              latitude: sql`excluded.latitude`,
              longitude: sql`excluded.longitude`,
              budget: sql`excluded.budget`,
              contractAmount: sql`excluded.contract_amount`,
              physicalProgress: sql`excluded.physical_progress`,
              financialProgress: sql`excluded.financial_progress`,
              implementingAgency: sql`excluded.implementing_agency`,
              contractorName: sql`excluded.contractor_name`,
              yearFunded: sql`excluded.year_funded`,
              startDate: sql`excluded.start_date`,
              targetCompletionDate: sql`excluded.target_completion_date`,
              actualCompletionDate: sql`excluded.actual_completion_date`,
              metadata: sql`excluded.metadata`,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
      }

      totalProcessed = Math.min(index + chunkSize, uniqueProjects.length);
      onProgress?.(totalProcessed, uniqueProjects.length, `Processed ${totalProcessed} of ${uniqueProjects.length} projects`);

      await db
        .update(syncLogs)
        .set({
          recordsAdded: projectsAdded,
          recordsUpdated: projectsUpdated,
          recordsFailed: projectsFailed,
          totalProcessed,
        })
        .where(eq(syncLogs.id, syncLog.id));
    }

    const duration = Date.now() - startTime;

    await db
      .update(syncLogs)
      .set({
        status: "completed",
        recordsAdded: projectsAdded,
        recordsUpdated: projectsUpdated,
        recordsFailed: projectsFailed,
        totalProcessed,
        errors: errors.map((error) => `${error.projectId}: ${error.message}`),
        completedAt: new Date(),
        duration,
      })
      .where(eq(syncLogs.id, syncLog.id));

    return {
      success: true,
      syncLogId: syncLog.id,
      statistics: {
        projectsAdded,
        projectsUpdated,
        projectsFailed,
        totalProcessed,
      },
      duration,
      errors,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown sync error";

    await db
      .update(syncLogs)
      .set({
        status: "failed",
        recordsAdded: projectsAdded,
        recordsUpdated: projectsUpdated,
        recordsFailed: projectsFailed,
        totalProcessed,
        errorDetails: message,
        errors: [...errors.map((entry) => `${entry.projectId}: ${entry.message}`), `sync: ${message}`],
        completedAt: new Date(),
        duration,
      })
      .where(eq(syncLogs.id, syncLog.id));

    return {
      success: false,
      syncLogId: syncLog.id,
      statistics: {
        projectsAdded,
        projectsUpdated,
        projectsFailed,
        totalProcessed,
      },
      duration,
      errors: [...errors, { projectId: "sync", message }],
    };
  }
}

export async function getRecentSyncLogs(limit = 20) {
  const rows = await db.query.syncLogs.findMany({
    where: eq(syncLogs.resource, "project"),
    orderBy: [desc(syncLogs.createdAt)],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    syncType: row.syncType,
    status: row.status as "running" | "completed" | "failed",
    projectsAdded: row.recordsAdded,
    projectsUpdated: row.recordsUpdated,
    projectsFailed: row.recordsFailed,
    totalProcessed: row.totalProcessed,
    errors: (row.errors ?? []).map((message) => ({ projectId: "sync", message })),
    errorDetails: row.errorDetails,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    duration: row.duration,
    triggeredBy: row.triggeredBy,
    createdAt: row.createdAt,
  }));
}

export async function getSyncStatistics() {
  const [latestSync] = await db.query.syncLogs.findMany({
    where: eq(syncLogs.resource, "project"),
    orderBy: [desc(syncLogs.createdAt)],
    limit: 1,
  });

  const [projectCount] = await db.select({ value: count() }).from(projects);

  return {
    totalProjects: Number(projectCount?.value ?? 0),
    lastSync: latestSync
      ? {
          syncedAt: latestSync.completedAt ?? latestSync.startedAt,
          status: latestSync.status,
          projectsAdded: latestSync.recordsAdded,
          projectsUpdated: latestSync.recordsUpdated,
          projectsFailed: latestSync.recordsFailed,
          duration: latestSync.duration,
        }
      : null,
  };
}

export async function getAdminProjectStats() {
  const [stats] = await db
    .select({
      total: count(),
      totalBudget: sql<string>`coalesce(sum(${projects.budget}), 0)::text`,
      ongoing: sql<number>`count(*) filter (where ${projects.status} = 'ongoing')::int`,
      completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')::int`,
      planned: sql<number>`count(*) filter (where ${projects.status} = 'planned')::int`,
      suspended: sql<number>`count(*) filter (where ${projects.status} = 'suspended')::int`,
    })
    .from(projects);

  return {
    total: Number(stats?.total ?? 0),
    totalBudget: Number(stats?.totalBudget ?? 0),
    ongoing: Number(stats?.ongoing ?? 0),
    completed: Number(stats?.completed ?? 0),
    planned: Number(stats?.planned ?? 0),
    suspended: Number(stats?.suspended ?? 0),
  };
}

export async function getAdminProjects(params: {
  search?: string;
  status?: string;
  program?: string;
  region?: string;
  province?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const conditions = [];

  if (params.search) {
    const search = `%${params.search}%`;
    conditions.push(or(ilike(projects.name, search), ilike(projects.sourceProjectId, search), ilike(projects.projectCode, search)));
  }

  if (params.status && params.status !== "all") {
    conditions.push(eq(projects.status, params.status));
  }

  if (params.program && params.program !== "all") {
    conditions.push(eq(projects.program, params.program));
  }

  if (params.region && params.region !== "all") {
    conditions.push(ilike(projects.region, params.region));
  }

  if (params.province && params.province !== "all") {
    conditions.push(ilike(projects.province, params.province));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db.select().from(projects).where(whereClause).orderBy(desc(projects.lastSyncedAt)).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(projects).where(whereClause),
  ]);

  const totalCount = Number(totalRows[0]?.value ?? 0);

  return {
    projects: rows,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

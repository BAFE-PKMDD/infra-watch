// import "server-only";

import { db } from "@/lib/db";
import { projects, syncLogs } from "@/lib/db/schema";
import { fetchInfraProjects } from "./client";
import { transformAbemisProject } from "./transform";
import { eq, sql, or, ilike, and, inArray } from "drizzle-orm";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";

type ProjectInsert = typeof projects.$inferInsert;
type SyncError = { projectId: string; message: string };

export async function syncAbemisProjects(
  options: { syncType?: string; triggeredBy?: string } | string = "system",
  onProgress?: (processed: number, total: number, message: string) => void
) {
  const syncType = typeof options === "string" ? "manual" : (options?.syncType || "manual");
  const triggeredBy = typeof options === "string" ? options : (options?.triggeredBy || "system");
  const syncStartTime = new Date();
  const startedAtMs = syncStartTime.getTime();
  
  // 1. Create a sync log entry
  const [syncLog] = await db
    .insert(syncLogs)
    .values({
      syncType,
      resource: "project",
      status: "running",
      triggeredBy,
      startedAt: syncStartTime,
      createdAt: syncStartTime,
    })
    .returning();

  let recordsAdded = 0;
  let recordsUpdated = 0;
  let recordsFailed = 0;
  let totalProcessed = 0;
  const errors: SyncError[] = [];
  const diagnostics: string[] = [];

  try {
    onProgress?.(0, 0, "Fetching metadata from ABEMIS...");
    // 2. Fetch projects (we fetch all for now, in chunks of 500)
    let page = 1;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const response = await fetchInfraProjects({ page, pageSize, noCache: true });
      
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch projects from ABEMIS API");
      }

      const rawProjects = response.data;
      const totalCount = response.pagination?.total_count || rawProjects.length;
      
      onProgress?.(
        totalProcessed, 
        totalCount, 
        `Processing page ${page} of ${response.pagination?.total_pages || '?'}`
      );

      if (rawProjects.length === 0) {
        hasMore = false;
        break;
      }

      // 3. Transform and insert data in chunks to avoid blowing up memory/params
      const chunkSize = 50;
      for (let i = 0; i < rawProjects.length; i += chunkSize) {
        const chunk = rawProjects.slice(i, i + chunkSize);
        const valuesById = new Map<string, ProjectInsert>();

        for (const rawProject of chunk) {
          try {
            const value = transformAbemisProject(rawProject);
            if (!value.abemisId) {
              throw new Error("Missing ABEMIS project ID");
            }
            valuesById.set(value.abemisId, value);
          } catch (error) {
            recordsFailed += 1;
            errors.push({
              projectId: rawProject.project_id || rawProject.id || "unknown",
              message: getReadableError(error),
            });
          }
        }

        totalProcessed += chunk.length;

        const values = Array.from(valuesById.values());
        if (values.length === 0) {
          continue;
        }

        const existingIds = await getExistingProjectIds(values.map((value) => value.abemisId).filter(Boolean));

        try {
          await upsertProjectValues(values);
          const updatedCount = values.filter((value) => existingIds.has(value.abemisId)).length;
          recordsUpdated += updatedCount;
          recordsAdded += values.length - updatedCount;
        } catch (error) {
          diagnostics.push(
            `Bulk upsert fallback on page ${page}, records ${i + 1}-${i + chunk.length}: ${getReadableError(error)}`
          );

          for (const value of values) {
            try {
              await upsertProjectValues([value]);
              if (existingIds.has(value.abemisId)) {
                recordsUpdated += 1;
              } else {
                recordsAdded += 1;
              }
            } catch (projectError) {
              recordsFailed += 1;
              errors.push({
                projectId: value.abemisId,
                message: getReadableError(projectError),
              });
            }
          }
        }
      }

      hasMore = page < (response.pagination?.total_pages || 1);
      page++;
    }

    onProgress?.(totalProcessed, totalProcessed, "Sync complete!");

  } catch (error: unknown) {
    console.error("Sync error:", error);
    errors.push({ projectId: "sync", message: getReadableError(error) });
  } finally {
    // 4. Update sync log
    const completedAt = new Date();
    const duration = getDurationSeconds(startedAtMs, completedAt.getTime());
    
    await db
      .update(syncLogs)
      .set({
        status: errors.length > 0 ? "failed" : "completed",
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        totalProcessed,
        errors: errors.map((error) => `${error.projectId}: ${error.message}`),
        errorDetails: diagnostics.length > 0 ? diagnostics.join("\n") : null,
        completedAt,
        duration,
      })
      .where(eq(syncLogs.id, syncLog.id));
  }

  return {
    success: errors.length === 0,
    syncLogId: syncLog.id,
    statistics: {
      projectsAdded: recordsAdded,
      projectsUpdated: recordsUpdated,
      projectsFailed: recordsFailed,
      totalProcessed,
    },
    duration: getDurationSeconds(startedAtMs),
    errors,
  };
}

async function getExistingProjectIds(projectIds: string[]) {
  if (projectIds.length === 0) return new Set<string>();

  const rows = await db
    .select({ abemisId: projects.abemisId })
    .from(projects)
    .where(inArray(projects.abemisId, projectIds));

  return new Set(rows.map((row) => row.abemisId));
}

async function upsertProjectValues(values: ProjectInsert[]) {
  await db
    .insert(projects)
    .values(values)
    .onConflictDoUpdate({
      target: projects.abemisId,
      set: {
        abemisRawId: sql`excluded.abemis_raw_id`,
        projectCode: sql`excluded.project_code`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        status: sql`excluded.status`,
        province: sql`excluded.province`,
        municipality: sql`excluded.municipality`,
        barangay: sql`excluded.barangay`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        budget: sql`excluded.budget`,
        abc: sql`excluded.abc`,
        contractAmount: sql`excluded.contract_amount`,
        calendarDays: sql`excluded.calendar_days`,
        physicalProgress: sql`excluded.physical_progress`,
        financialProgress: sql`excluded.financial_progress`,
        implementingAgency: sql`excluded.implementing_agency`,
        contractorName: sql`excluded.contractor_name`,
        startDate: sql`excluded.start_date`,
        targetCompletionDate: sql`excluded.target_completion_date`,
        actualCompletionDate: sql`excluded.actual_completion_date`,
        operatingUnit: sql`excluded.operating_unit`,
        bannerProgram: sql`excluded.banner_program`,
        yearFunded: sql`excluded.year_funded`,
        projectType: sql`excluded.project_type`,
        region: sql`excluded.region`,
        district: sql`excluded.district`,
        stage: sql`excluded.stage`,
        program: sql`excluded.program`,
        author: sql`excluded.author`,
        quantity: sql`excluded.quantity`,
        quantityUnit: sql`excluded.quantity_unit`,
        beneficiary: sql`excluded.beneficiary`,
        prexcProgram: sql`excluded.prexc_program`,
        subProgram: sql`excluded.sub_program`,
        indicatorLevel1: sql`excluded.indicator_level1`,
        indicatorLevel3: sql`excluded.indicator_level3`,
        recipientType: sql`excluded.recipient_type`,
        budgetProcess: sql`excluded.budget_process`,
        dateTurnOver: sql`excluded.date_turn_over`,
        roadClass: sql`excluded.road_class`,
        roadType: sql`excluded.road_type`,
        roadUsed: sql`excluded.road_used`,
        implementationType: sql`excluded.implementation_type`,
        proposedLength: sql`excluded.proposed_length`,
        postGeotaggedLength: sql`excluded.post_geotagged_length`,
        procurementMode: sql`excluded.procurement_mode`,
        psgcCode: sql`excluded.psgc_code`,
        metadata: sql`excluded.metadata`,
        commodities: sql`excluded.commodities`,
        geom: sql`excluded.geom`,
        lastSyncedAt: sql`excluded.last_synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

function getReadableError(error: unknown) {
  const cause = typeof error === "object" && error && "cause" in error
    ? (error as { cause?: unknown }).cause
    : null;
  const causeMessage = typeof cause === "object" && cause && "message" in cause
    ? String((cause as { message?: unknown }).message)
    : null;
  const message = causeMessage || (error instanceof Error ? error.message : "Unknown sync error");

  return message.replace(/\s+/g, " ").slice(0, 500);
}

function getDurationSeconds(startedAtMs: number, completedAtMs = Date.now()) {
  return Math.max(1, Math.round((completedAtMs - startedAtMs) / 1000));
}

export async function getRecentSyncLogs(limit = 20) {
  const rows = await db.query.syncLogs.findMany({
    where: eq(syncLogs.resource, "project"),
    orderBy: [sql`created_at desc`],
    limit,
  });

  return rows.map((row) => {
    const storedErrors = row.errors ?? [];
    const failedCount = row.recordsFailed || (row.status === "failed" ? storedErrors.length : 0);

    return {
      id: row.id,
      syncType: row.syncType,
      status: row.status,
      projectsAdded: row.recordsAdded,
      projectsUpdated: row.recordsUpdated,
      projectsFailed: failedCount,
      totalProcessed: row.totalProcessed,
      errors: storedErrors.map(formatStoredSyncError),
      errorDetails: row.errorDetails,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      duration: row.duration,
      triggeredBy: row.triggeredBy,
      createdAt: row.createdAt,
    };
  });
}

function formatStoredSyncError(message: string) {
  const [projectId, ...rest] = message.split(": ");
  return {
    projectId: rest.length > 0 ? projectId : "sync",
    message: rest.length > 0 ? rest.join(": ") : message,
  };
}

export async function getSyncStatistics() {
  const [latestSync] = await db.query.syncLogs.findMany({
    where: eq(syncLogs.resource, "project"),
    orderBy: [sql`created_at desc`],
    limit: 1,
  });

  const [projectCount] = await db.select({ value: sql`count(*)` }).from(projects);

  return {
    totalProjects: Number(projectCount?.value ?? 0),
    lastSync: latestSync
      ? {
          syncedAt: latestSync.completedAt ?? latestSync.startedAt,
          status: latestSync.status,
          projectsAdded: latestSync.recordsAdded,
          projectsUpdated: latestSync.recordsUpdated,
          projectsFailed: latestSync.recordsFailed || (latestSync.status === "failed" ? latestSync.errors?.length ?? 0 : 0),
          duration: latestSync.duration,
        }
      : null,
  };
}

export async function getAdminProjectStats(user?: ScopedUser) {
  const conditions = user ? getProjectScopeConditions(user) : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      total: sql`count(*)`,
      totalBudget: sql`coalesce(sum(${projects.budget}), 0)::text`,
      ongoing: sql`count(*) filter (where ${projects.status} = 'ongoing')::int`,
      completed: sql`count(*) filter (where ${projects.status} = 'completed')::int`,
      planned: sql`count(*) filter (where ${projects.status} = 'planned')::int`,
      suspended: sql`count(*) filter (where ${projects.status} = 'suspended')::int`,
    })
    .from(projects)
    .where(whereClause);

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
}, user?: ScopedUser) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const conditions = user ? getProjectScopeConditions(user) : [];

  if (params.search) {
    const search = `%${params.search}%`;
    conditions.push(or(ilike(projects.name, search), ilike(projects.abemisId, search), ilike(projects.projectCode, search))!);
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
    db.select().from(projects).where(whereClause).orderBy(sql`last_synced_at desc`).limit(pageSize).offset(offset),
    db.select({ value: sql`count(*)` }).from(projects).where(whereClause),
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

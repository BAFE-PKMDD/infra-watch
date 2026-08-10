const fs = require('fs');

const codeToAppend = `
export async function getRecentSyncLogs(limit = 20) {
  const rows = await db.query.syncLogs.findMany({
    where: eq(syncLogs.resource, "project"),
    orderBy: [sql\`last_synced_at desc\`],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    syncType: row.syncType,
    status: row.status,
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
    orderBy: [sql\`created_at desc\`],
    limit: 1,
  });

  const [projectCount] = await db.select({ value: sql\`count(*)\` }).from(projects);

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
      total: sql\`count(*)\`,
      totalBudget: sql\`coalesce(sum(\${projects.budget}), 0)::text\`,
      ongoing: sql\`count(*) filter (where \${projects.status} = 'ongoing')::int\`,
      completed: sql\`count(*) filter (where \${projects.status} = 'completed')::int\`,
      planned: sql\`count(*) filter (where \${projects.status} = 'planned')::int\`,
      suspended: sql\`count(*) filter (where \${projects.status} = 'suspended')::int\`,
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
    const search = \`%\${params.search}%\`;
    conditions.push(or(ilike(projects.name, search), ilike(projects.abemisId, search), ilike(projects.projectCode, search)));
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
    db.select().from(projects).where(whereClause).orderBy(sql\`last_synced_at desc\`).limit(pageSize).offset(offset),
    db.select({ value: sql\`count(*)\` }).from(projects).where(whereClause),
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
`;

fs.appendFileSync('lib/abemis/sync.ts', codeToAppend);
console.log('Successfully appended helper functions!');

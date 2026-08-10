import { and, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { projectMetricSnapshots, projects } from "@/lib/db/schema";

export type SnapshotCaptureInput = {
  syncLogId: string;
  capturedAt: Date;
  projectIds?: string[];
};

export const PROJECT_METRIC_SNAPSHOT_RETENTION_DAYS = 365;

type RepositoryCaptureInput = SnapshotCaptureInput & { captureDate: string };

export type ProjectMetricSnapshotRepository = {
  captureForSync(input: RepositoryCaptureInput): Promise<number>;
};

export function activeSnapshotCondition() {
  return sql`not (
    lower(btrim(coalesce(${projects.status}, ''))) in ('completed', 'inventory')
    or lower(coalesce(${projects.status}, '')) like '%complete%'
    or lower(coalesce(${projects.status}, '')) like '%done%'
  )`;
}

function reportedPhysicalProgressExpression() {
  return sql<number | null>`case when exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(${projects.metadata}->'powRelation') = 'array'
        then ${projects.metadata}->'powRelation'
        else '[]'::jsonb
      end
    ) as pow(item)
    where nullif(btrim(pow.item->>'actual'), '') is not null
      and replace(btrim(pow.item->>'actual'), ',', '') ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$'
  ) then ${projects.physicalProgress} else null end`;
}

const drizzleSnapshotRepository: ProjectMetricSnapshotRepository = {
  async captureForSync({ syncLogId, captureDate, capturedAt, projectIds }) {
    if (projectIds?.length === 0) return 0;

    const conditions = [activeSnapshotCondition()];
    if (projectIds) conditions.push(inArray(projects.abemisId, projectIds));

    const capturedAtIso = capturedAt.toISOString();
    // Financial progress remains NULL until an authoritative source field is approved.
    const inserted = await db.execute(sql`
      insert into "project_metric_snapshots" (
        "project_id", "sync_log_id", "capture_date", "captured_at",
        "physical_progress", "financial_progress", "budget", "abc",
        "program", "region", "province", "year_funded", "project_type",
        "status", "target_completion_date", "source_last_synced_at"
      )
      select
        ${projects.abemisId}, ${syncLogId}::uuid, ${captureDate}::date,
        ${capturedAtIso}::timestamp, ${reportedPhysicalProgressExpression()},
        null::integer, ${projects.budget}, ${projects.abc},
        ${projects.program}, ${projects.region}, ${projects.province},
        ${projects.yearFunded}, ${projects.projectType},
        ${projects.status}, ${projects.targetCompletionDate}, ${projects.lastSyncedAt}
      from ${projects}
      where ${and(...conditions)}
      on conflict ("project_id", "capture_date") do update set
        "sync_log_id" = excluded."sync_log_id",
        "captured_at" = excluded."captured_at",
        "physical_progress" = excluded."physical_progress",
        "financial_progress" = excluded."financial_progress",
        "budget" = excluded."budget",
        "abc" = excluded."abc",
        "program" = excluded."program",
        "region" = excluded."region",
        "province" = excluded."province",
        "year_funded" = excluded."year_funded",
        "project_type" = excluded."project_type",
        "status" = excluded."status",
        "target_completion_date" = excluded."target_completion_date",
        "source_last_synced_at" = excluded."source_last_synced_at"
      where "project_metric_snapshots"."captured_at" < excluded."captured_at"
      returning "id"
    `);

    return inserted.length;
  },
};

export async function captureProjectMetricSnapshots(
  input: SnapshotCaptureInput,
  repository: ProjectMetricSnapshotRepository = drizzleSnapshotRepository,
) {
  return repository.captureForSync({
    ...input,
    captureDate: manilaDateKey(input.capturedAt),
  });
}

export async function pruneProjectMetricSnapshots(
  asOf: Date,
  retentionDays = PROJECT_METRIC_SNAPSHOT_RETENTION_DAYS,
) {
  const cutoff = snapshotRetentionCutoff(asOf, retentionDays);
  await db
    .delete(projectMetricSnapshots)
    .where(lt(projectMetricSnapshots.captureDate, cutoff));
  return 0;
}

export function snapshotRetentionCutoff(asOf: Date, retentionDays: number) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error("Snapshot retention must be a positive whole number of days");
  }
  const cutoff = new Date(`${manilaDateKey(asOf)}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (retentionDays - 1));
  return cutoff.toISOString().slice(0, 10);
}

function manilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
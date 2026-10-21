import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { retryDelay, type JobKind } from "@/lib/operations-models";

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export async function enqueueJob(
  kind: JobKind,
  requestedBy: string,
  payload: Record<string, unknown> = {},
  dedupeKey: string = kind,
  database: Pick<typeof db, "insert" | "select"> = db,
): Promise<BackgroundJob> {
  const [created] = await database
    .insert(backgroundJobs)
    .values({ kind, requestedBy, payload, dedupeKey })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [existing] = await database
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.dedupeKey, dedupeKey),
        sql`${backgroundJobs.status} in ('queued', 'running')`,
      ),
    )
    .limit(1);
  if (!existing)
    return enqueueJob(kind, requestedBy, payload, dedupeKey, database);
  return existing;
}

export async function listJobs(kind?: JobKind) {
  return db
    .select()
    .from(backgroundJobs)
    .where(kind ? eq(backgroundJobs.kind, kind) : undefined)
    .orderBy(desc(backgroundJobs.createdAt))
    .limit(30);
}

export async function claimJob(id?: string): Promise<BackgroundJob | null> {
  // The token fences off a worker that resumes after another worker reclaimed its expired lease.
  const rows = await db.execute(sql`
    UPDATE background_jobs SET status = 'running', attempts = attempts + 1,
      lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes', updated_at = now()
    WHERE id = (
      SELECT id FROM background_jobs
      WHERE ((status = 'queued' AND available_at <= now()) OR (status = 'running' AND lease_until < now()))
        AND attempts < max_attempts
        AND (${id ?? null}::uuid IS NULL OR id = ${id ?? null}::uuid)
      ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1
    ) RETURNING id
  `);
  const claimed = Array.from(rows)[0] as { id?: string } | undefined;
  if (!claimed?.id) {
    await db.execute(
      sql`UPDATE background_jobs SET status = 'failed', error = 'Worker stopped before the final attempt completed', updated_at = now() WHERE status = 'running' AND lease_until < now() AND attempts >= max_attempts AND (${id ?? null}::uuid IS NULL OR id = ${id ?? null}::uuid)`,
    );
    return null;
  }
  const [job] = await db
    .select()
    .from(backgroundJobs)
    .where(eq(backgroundJobs.id, claimed.id))
    .limit(1);
  return job;
}

function ownedJob(job: BackgroundJob) {
  return and(
    eq(backgroundJobs.id, job.id),
    eq(backgroundJobs.leaseToken, job.leaseToken!),
    eq(backgroundJobs.status, "running"),
  );
}

export async function heartbeatJob(
  job: BackgroundJob,
  progress: BackgroundJob["progress"],
) {
  const rows = await db
    .update(backgroundJobs)
    .set({
      progress,
      leaseUntil: new Date(Date.now() + 120_000),
      updatedAt: new Date(),
    })
    .where(ownedJob(job))
    .returning({ id: backgroundJobs.id });
  if (!rows.length) throw new Error("Job lease was lost");
}

export async function finishJob(
  job: BackgroundJob,
  result: Record<string, unknown>,
) {
  await db
    .update(backgroundJobs)
    .set({
      status: "completed",
      result,
      error: null,
      leaseUntil: null,
      progress: { ...job.progress, message: "Completed" },
      updatedAt: new Date(),
    })
    .where(ownedJob(job));
}

export async function failJob(job: BackgroundJob) {
  await db
    .update(backgroundJobs)
    .set({
      status: job.attempts < job.maxAttempts ? "queued" : "failed",
      error:
        "Processing failed. Retry from the operations screen or contact an administrator.",
      leaseUntil: null,
      availableAt: new Date(Date.now() + retryDelay(job.attempts)),
      updatedAt: new Date(),
    })
    .where(ownedJob(job));
}

import assert from "node:assert/strict";
import { beforeEach, mock, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

let viewer: { id: string; role: string; region?: string } | null = { id: "staff-a", role: "admin" };
let stored: Array<{ automatic: boolean; seen: Record<string, string> }> = [];
let writes: Record<string, unknown>[] = [];
let conflicts: Array<{ set: { seen: SQL; automatic: boolean } }> = [];
let readWhere: SQL | null = null;

mock.module("@/lib/session", () => ({ requireAuth: async () => {
  if (!viewer) throw new Error("Unauthorized");
  return viewer;
} }));
mock.module("@/lib/db", () => ({ db: {
  select: () => ({ from: () => ({ where: (where: SQL) => {
    readWhere = where;
    return { limit: async () => stored };
  } }) }),
  insert: () => ({ values: (value: Record<string, unknown>) => {
    writes.push(value);
    return { onConflictDoUpdate: async (conflict: { set: { seen: SQL; automatic: boolean } }) => { conflicts.push(conflict); } };
  } }),
} }));

const { getTourProgress, saveTourProgress } = await import("./tours");
const dialect = new PgDialect();
const update = { tourId: "dashboard", outcome: "completed", disableAutomatic: false };

beforeEach(() => {
  viewer = { id: "staff-a", role: "admin" };
  stored = []; writes = []; conflicts = []; readWhere = null;
});

test("progress reads are scoped to the authenticated account", async () => {
  assert.deepEqual(await getTourProgress(), { automatic: true, seen: {} });
  assert.ok(readWhere);
  assert.deepEqual(dialect.sqlToQuery(readWhere).params, ["staff-a"]);
  stored = [{ automatic: false, seen: { "v1:welcome": "completed" } }];
  assert.deepEqual(await getTourProgress(), stored[0]);
});

test("only the authenticated user is written and JSON progress is merged atomically", async () => {
  await saveTourProgress(update);
  assert.deepEqual(writes[0], { userId: "staff-a", automatic: true, seen: { "v1:dashboard": "completed" } });
  const query = dialect.sqlToQuery(conflicts[0].set.seen);
  assert.match(query.sql, /"user_tour_progress"\."seen" \|\|/);
  assert.deepEqual(query.params, ["v1:dashboard", '{"v1:dashboard":"completed"}']);
  assert.match(query.sql, /case when .* ->> .* = 'completed' then .* else/, "earned progress must survive skipped replays and concurrent tabs");
  await saveTourProgress({ ...update, disableAutomatic: true });
  assert.equal(conflicts[1].set.automatic, false);
});

test("unauthenticated and unknown roles cannot read or write tour state", async () => {
  for (const user of [null, { id: "unknown", role: "unknown" }]) {
    viewer = user;
    await assert.rejects(getTourProgress);
    await assert.rejects(() => saveTourProgress(update));
  }
  assert.equal(writes.length, 0);
});

test("citizens can save only their own citizen guides, never admin guides", async () => {
  viewer = { id: "citizen-a", role: "citizen" };
  assert.deepEqual(await getTourProgress(), { automatic: true, seen: {} });
  assert.ok(readWhere);
  assert.deepEqual(dialect.sqlToQuery(readWhere).params, ["citizen-a"]);
  for (const tourId of ["citizen-welcome", "citizen-feedback", "citizen-report", "citizen-contact", "citizen-sms"]) {
    await saveTourProgress({ ...update, tourId });
  }
  assert.equal(writes.length, 5);
  assert.ok(writes.every((write) => write.userId === "citizen-a"));
  for (const tourId of ["welcome", "dashboard", "live-reply", "sync"]) {
    await assert.rejects(() => saveTourProgress({ ...update, tourId }), /Forbidden/);
  }
  viewer = { id: "staff-a", role: "admin" };
  await assert.rejects(() => saveTourProgress({ ...update, tourId: "citizen-feedback" }), /Forbidden/);
  assert.equal(writes.length, 5);
});

test("a scoped moderator can save analytics but cannot save admin-only tours", async () => {
  viewer = { id: "moderator-a", role: "moderator", region: "Region I" };
  await saveTourProgress(update);
  assert.equal(writes.length, 1);
  await assert.rejects(() => saveTourProgress({ ...update, tourId: "sync" }), /Forbidden/);
  viewer = { id: "moderator-a", role: "moderator" };
  await assert.rejects(() => saveTourProgress(update), /Forbidden/);
  assert.equal(writes.length, 1);
});

test("invalid input and account spoofing never write to storage", async () => {
  await assert.rejects(() => saveTourProgress({ ...update, userId: "staff-b" }));
  await assert.rejects(() => saveTourProgress({ ...update, tourId: "unknown" }));
  assert.equal(writes.length, 0);
});

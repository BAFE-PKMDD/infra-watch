import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const migration = readFileSync(new URL("../drizzle/0014_add_live_videos.sql", import.meta.url), "utf8");
const snapshot = JSON.parse(
  readFileSync(new URL("../drizzle/meta/0014_snapshot.json", import.meta.url), "utf8"),
) as {
  tables: Record<string, {
    columns: Record<string, { notNull: boolean; default?: unknown }>;
    indexes: Record<string, { isUnique: boolean; where?: string }>;
  }>;
};

test("creates the complete multi-provider live-video schema", () => {
  for (const column of [
    "video_type",
    "facebook_video_url",
    "video_path",
    "thumbnail_path",
    "duration",
    "is_featured",
    "display_order",
  ]) {
    assert.match(migration, new RegExp(`"${column}"`));
    assert.ok(snapshot.tables["public.live_videos"].columns[column]);
  }
  assert.equal(snapshot.tables["public.live_videos"].columns.facebook_video_url.notNull, false);
});

test("allows simultaneous live broadcasts once the single-live index is dropped", () => {
  assert.match(migration, /CREATE UNIQUE INDEX "live_videos_single_live_uidx"/);
  assert.ok(snapshot.tables["public.live_videos"].indexes.live_videos_single_live_uidx);

  const dropMigration = readFileSync(new URL("../drizzle/0035_allow_simultaneous_live_videos.sql", import.meta.url), "utf8");
  assert.match(dropMigration, /DROP INDEX IF EXISTS "live_videos_single_live_uidx"/);
  const latest = JSON.parse(
    readFileSync(new URL("../drizzle/meta/0035_snapshot.json", import.meta.url), "utf8"),
  ) as typeof snapshot;
  assert.equal(latest.tables["public.live_videos"].indexes.live_videos_single_live_uidx, undefined);
});

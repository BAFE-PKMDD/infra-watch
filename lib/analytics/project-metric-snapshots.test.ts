import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { projectMetricSnapshots, projects } from "@/lib/db/schema";
import {
  activeSnapshotCondition,
  captureProjectMetricSnapshots,
  snapshotRetentionCutoff,
  type ProjectMetricSnapshotRepository,
} from "./project-metric-snapshots";

test("snapshot schema keeps only one latest capture per project and Manila day", () => {
  const config = getTableConfig(projectMetricSnapshots);
  const uniqueIndex = config.indexes.find(
    (index) => index.config.name === "project_metric_snapshots_project_day_uidx",
  );
  const retentionIndex = config.indexes.find(
    (index) => index.config.name === "project_metric_snapshots_capture_date_idx",
  );

  assert.ok(uniqueIndex?.config.unique);
  assert.deepEqual(
    uniqueIndex.config.columns.map((column) => "name" in column ? column.name : null),
    ["project_id", "capture_date"],
  );
  assert.deepEqual(
    retentionIndex?.config.columns.map((column) => "name" in column ? column.name : null),
    ["capture_date"],
  );
});

test("repeating snapshot capture for one sync and day is idempotent", async () => {
  const captured = new Set<string>();
  const repository: ProjectMetricSnapshotRepository = {
    async captureForSync({ syncLogId, captureDate }) {
      const key = `${syncLogId}:${captureDate}`;
      if (captured.has(key)) return 0;
      captured.add(key);
      return 2;
    },
  };

  const input = { syncLogId: "sync-1", capturedAt: new Date("2026-08-10T12:00:00+08:00") };
  assert.equal(await captureProjectMetricSnapshots(input, repository), 2);
  assert.equal(await captureProjectMetricSnapshots(input, repository), 0);
});

test("uses the Manila calendar day for snapshot retention and idempotency", async () => {
  let receivedDate = "";
  const repository: ProjectMetricSnapshotRepository = {
    async captureForSync({ captureDate }) {
      receivedDate = captureDate;
      return 0;
    },
  };

  await captureProjectMetricSnapshots(
    { syncLogId: "sync-2", capturedAt: new Date("2026-08-09T16:30:00.000Z") },
    repository,
  );

  assert.equal(receivedDate, "2026-08-10");
});

test("retains one bounded year of daily snapshots", () => {
  assert.equal(
    snapshotRetentionCutoff(new Date("2026-08-10T12:00:00+08:00"), 365),
    "2025-08-11",
  );
});

test("stores project and snapshot ABC values as fixed-precision currency", () => {
  assert.equal(projects.abc.getSQLType(), "numeric(14, 2)");
  assert.equal(projectMetricSnapshots.abc.getSQLType(), "numeric(14, 2)");
});

test("preserves missing physical-progress evidence as nullable history", () => {
  const config = getTableConfig(projectMetricSnapshots);
  const progress = config.columns.find((column) => column.name === "physical_progress");
  assert.equal(progress?.notNull, false);
  assert.equal(progress?.hasDefault, false);
});

test("snapshot eligibility excludes canonical completed and inventory variants", () => {
  const compiled = new PgDialect().sqlToQuery(activeSnapshotCondition());
  assert.match(compiled.sql, /inventory/i);
  assert.match(compiled.sql, /complete/i);
  assert.match(compiled.sql, /done/i);
});

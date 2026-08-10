import assert from "node:assert/strict";
import test from "node:test";
import { and } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { buildSnapshotFilterConditions, nullableDelta } from "./dashboard-changes";

test("does not fabricate a zero historical delta when either aggregate is missing", () => {
  assert.equal(nullableDelta(null, 10), null);
  assert.equal(nullableDelta(10, null), null);
  assert.equal(nullableDelta(null, null), null);
  assert.equal(nullableDelta(12.5, 10, 2), 2.5);
});

test("historical dashboard filters use snapshot-era dimensions and Unknown semantics", () => {
  const conditions = buildSnapshotFilterConditions({
    program: "AMEFIP",
    region: "Unknown",
  });
  const compiled = new PgDialect().sqlToQuery(and(...conditions)!);
  assert.match(compiled.sql, /project_metric_snapshots.*program/i);
  assert.match(compiled.sql, /project_metric_snapshots.*region/i);
  assert.match(compiled.sql, /is null/i);
  assert.match(compiled.sql, /btrim/i);
});

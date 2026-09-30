import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

import { captureSnapshotsAfterSuccessfulSync, getReadableError } from "./sync";

const syncSource = readFileSync(new URL("./sync.ts", import.meta.url), "utf8");

test("captures snapshots only after a successful source sync", async () => {
  let calls = 0;
  await captureSnapshotsAfterSuccessfulSync(
    { successful: false, syncLogId: "sync-1", capturedAt: new Date(), projectIds: ["p-1"] },
    {
      capture: async () => { calls += 1; return 1; },
      logError: () => undefined,
    },
  );
  await captureSnapshotsAfterSuccessfulSync(
    { successful: true, syncLogId: "sync-2", capturedAt: new Date(), projectIds: ["p-1"] },
    {
      capture: async () => { calls += 1; return 1; },
      logError: () => undefined,
    },
  );

  assert.equal(calls, 1);
});

test("snapshot failure is logged visibly without changing successful sync completion", async () => {
  const logged: unknown[] = [];
  await assert.doesNotReject(() =>
    captureSnapshotsAfterSuccessfulSync(
      { successful: true, syncLogId: "sync-3", capturedAt: new Date(), projectIds: ["p-1"] },
      {
        capture: async () => { throw new Error("snapshot storage unavailable"); },
        logError: (...values) => { logged.push(values); },
      },
    ),
  );

  assert.equal(logged.length, 1);
  assert.match(String((logged[0] as unknown[])[0]), /snapshot capture failed/i);
  assert.match(String((logged[0] as unknown[])[1]), /snapshot storage unavailable/i);
});

test("external ID corrections never delete and recreate referenced projects", () => {
  assert.doesNotMatch(syncSource, /\.delete\(projects\)/);
  assert.match(syncSource, /Never delete and recreate a project/);
});

test("getReadableError unwraps a raw query failure to its Postgres cause", () => {
  const pgError = new Error("value too long for type character varying(50)");
  const queryError = new Error(
    'Failed query: update "projects" set "name" = $1 where "abemis_id" = $2 params: ["a very long name", "2026-R8-NOS-INFRA-HVCDP-NE-00382"]',
    { cause: pgError },
  );

  assert.equal(getReadableError(queryError), "value too long for type character varying(50)");
});

test("getReadableError keeps a deliberately re-thrown message instead of its wrapped cause", () => {
  // Mirrors renameProjectByRawId: it re-throws its own explanation with the raw
  // DrizzleQueryError (whose own .message is just the unhelpful "Failed query: ..." text)
  // as `cause`. The friendly outer message must win, not the wrapper text underneath it.
  const queryError = new Error('Failed query: update "projects" set "abemis_id" = $1 ...', { cause: new Error("update or delete on table violates foreign key constraint") });
  const renameError = new Error(
    "Cannot relabel project with abemis_raw_id 66592 while dependent records still reference its current ABEMIS ID",
    { cause: queryError },
  );

  assert.equal(
    getReadableError(renameError),
    "Cannot relabel project with abemis_raw_id 66592 while dependent records still reference its current ABEMIS ID",
  );
});

test("getReadableError falls back to the error's own message when there is no cause", () => {
  assert.equal(getReadableError(new Error("Missing ABEMIS project ID")), "Missing ABEMIS project ID");
  assert.equal(getReadableError("not an Error instance"), "Unknown sync error");
});

test("getReadableError collapses whitespace and caps length for the sync-history column", () => {
  const long = "x".repeat(600);
  const result = getReadableError(new Error(`line one\n  line   two ${long}`));

  assert.doesNotMatch(result, /\n|  /);
  assert.equal(result.length, 500);
});

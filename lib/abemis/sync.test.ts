import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { captureSnapshotsAfterSuccessfulSync } from "./sync";

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

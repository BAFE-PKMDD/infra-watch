import assert from "node:assert/strict";
import test from "node:test";

import { initializeNodeRuntime, shouldReconcileStorageAtStartup } from "./server-startup";

test("storage reconciliation runs only when starting the production server", () => {
  assert.equal(shouldReconcileStorageAtStartup({
    nodeEnv: "production",
    nextPhase: undefined,
  }), true);
  assert.equal(shouldReconcileStorageAtStartup({
    nodeEnv: "production",
    nextPhase: "phase-production-build",
  }), false);
  assert.equal(shouldReconcileStorageAtStartup({
    nodeEnv: "development",
    nextPhase: undefined,
  }), false);
});

test("storage policy reconciliation completes before the scheduler starts", async () => {
  const calls: string[] = [];

  await initializeNodeRuntime({
    reconcileStorage: async () => {
      calls.push("storage");
    },
    startScheduler: () => {
      calls.push("scheduler");
    },
  });

  assert.deepEqual(calls, ["storage", "scheduler"]);
});

test("startup fails closed and does not start the scheduler when storage reconciliation fails", async () => {
  let schedulerStarted = false;

  await assert.rejects(
    initializeNodeRuntime({
      reconcileStorage: async () => {
        throw new Error("unsafe storage policy");
      },
      startScheduler: () => {
        schedulerStarted = true;
      },
    }),
    /unsafe storage policy/,
  );

  assert.equal(schedulerStarted, false);
});

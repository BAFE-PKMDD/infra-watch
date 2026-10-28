import assert from "node:assert/strict";
import { test } from "bun:test";

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

const noSleep = async () => {};

test("a brief storage connection failure is retried and startup then completes", async () => {
  let attempts = 0;
  let schedulerStarted = false;

  await initializeNodeRuntime(
    {
      reconcileStorage: async () => {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
      },
      startScheduler: () => {
        schedulerStarted = true;
      },
    },
    { attempts: 5, sleep: noSleep },
  );

  assert.equal(attempts, 3);
  assert.equal(schedulerStarted, true);
});

test("startup still fails closed when storage stays unreachable", async () => {
  let attempts = 0;
  let schedulerStarted = false;

  await assert.rejects(
    initializeNodeRuntime(
      {
        reconcileStorage: async () => {
          attempts += 1;
          throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
        },
        startScheduler: () => {
          schedulerStarted = true;
        },
      },
      { attempts: 3, sleep: noSleep },
    ),
    /ECONNREFUSED/,
  );

  assert.equal(attempts, 3);
  assert.equal(schedulerStarted, false);
});

test("a storage policy violation is not retried", async () => {
  let attempts = 0;

  await assert.rejects(
    initializeNodeRuntime(
      {
        reconcileStorage: async () => {
          attempts += 1;
          throw new Error("Private MinIO bucket permits anonymous reads");
        },
        startScheduler: () => {},
      },
      { attempts: 5, sleep: noSleep },
    ),
    /anonymous reads/,
  );

  assert.equal(attempts, 1);
});

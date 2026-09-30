import assert from "node:assert/strict";
import { test } from "bun:test";

import { createProgressCurveGetHandler } from "./route";

const sampleResult = {
  projectId: "2022-R3-BUL-INFRA-1",
  projectName: "Construction of Warehouse",
  points: [{ date: "2026-01-01", actualProgress: 40, plannedProgress: 55 }],
};

function request(query = "") {
  return new Request(`http://localhost/api/admin/analytics/progress-curve${query}`);
}

test("requires authentication and analytics permission for the progress curve", async () => {
  const unauthenticated = await createProgressCurveGetHandler({
    getCurrentUser: async () => null,
    canViewAnalytics: () => false,
    getProgressCurve: async () => sampleResult,
  })(request("?projectId=abc"));
  assert.equal(unauthenticated.status, 401);

  const forbidden = await createProgressCurveGetHandler({
    getCurrentUser: async () => ({ id: "citizen", role: "citizen" }),
    canViewAnalytics: () => false,
    getProgressCurve: async () => sampleResult,
  })(request("?projectId=abc"));
  assert.equal(forbidden.status, 403);
});

test("passes the requested project id to the scoped service", async () => {
  const admin = { id: "a1", role: "admin" };
  let received: unknown;
  const response = await createProgressCurveGetHandler({
    getCurrentUser: async () => admin,
    canViewAnalytics: () => true,
    getProgressCurve: async (projectId, user) => {
      received = { projectId, user };
      return sampleResult;
    },
  })(request("?projectId=2022-R3-BUL-INFRA-1"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(received, { projectId: "2022-R3-BUL-INFRA-1", user: admin });
});

test("returns 404 when the project is outside the viewer's scope", async () => {
  const response = await createProgressCurveGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getProgressCurve: async () => null,
  })(request("?projectId=missing"));
  assert.equal(response.status, 404);
});

test("rejects a missing project id", async () => {
  const response = await createProgressCurveGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getProgressCurve: async () => sampleResult,
  })(request(""));
  assert.equal(response.status, 400);
});

test("fails closed for an unassigned regional moderator", async () => {
  let calls = 0;
  const response = await createProgressCurveGetHandler({
    getCurrentUser: async () => ({ id: "m1", role: "moderator", region: null, assignedAgency: null }),
    canViewAnalytics: () => true,
    getProgressCurve: async () => {
      calls += 1;
      return sampleResult;
    },
  })(request("?projectId=abc"));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

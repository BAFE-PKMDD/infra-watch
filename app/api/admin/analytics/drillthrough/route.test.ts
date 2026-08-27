import assert from "node:assert/strict";
import test from "node:test";

import { createAnalyticsDrillthroughGetHandler } from "./route";

const emptyResult = {
  asOf: "2026-08-26",
  total: 0,
  page: 1,
  pageSize: 25,
  projects: [],
};

function request(query = "") {
  return new Request(`http://localhost/api/admin/analytics/drillthrough${query}`);
}

test("requires authentication and analytics permission for drill-through", async () => {
  const unauthenticated = await createAnalyticsDrillthroughGetHandler({
    getCurrentUser: async () => null,
    canViewAnalytics: () => false,
    getDrillthroughData: async () => emptyResult,
  })(request());
  assert.equal(unauthenticated.status, 401);

  const forbidden = await createAnalyticsDrillthroughGetHandler({
    getCurrentUser: async () => ({ id: "citizen", role: "citizen" }),
    canViewAnalytics: () => false,
    getDrillthroughData: async () => emptyResult,
  })(request());
  assert.equal(forbidden.status, 403);
});

test("passes validated chart filters and bounded pagination to the scoped service", async () => {
  const moderator = { id: "m1", role: "moderator", region: "Region VIII", assignedAgency: "AMEFIP" };
  let received: unknown;
  const response = await createAnalyticsDrillthroughGetHandler({
    getCurrentUser: async () => moderator,
    canViewAnalytics: () => true,
    getDrillthroughData: async (filters, user, pagination) => {
      received = { filters, user, pagination };
      return emptyResult;
    },
  })(request("?region=Region+VIII&health=delayed&page=2&pageSize=20"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(received, {
    filters: { region: "Region VIII", health: "delayed" },
    user: moderator,
    pagination: { page: 2, pageSize: 20 },
  });
});

test("passes a bounded Other project-type group without treating Other as a literal type", async () => {
  let options: unknown;
  const response = await createAnalyticsDrillthroughGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getDrillthroughData: async (_filters, _user, _pagination, receivedOptions) => {
      options = receivedOptions;
      return emptyResult;
    },
  })(request("?projectTypeGroup=otherProjectTypes&excludeProjectType=Warehouse&excludeProjectType=Diversion+Dam"));
  assert.equal(response.status, 200);
  assert.deepEqual(options, {
    otherProjectTypes: { excluded: ["Warehouse", "Diversion Dam"] },
  });
});

test("rejects invalid or oversized drill-through pagination", async () => {
  for (const query of ["?page=0", "?pageSize=51", "?health=unsafe", "?projectTypeGroup=otherProjectTypes", "?excludeProjectType=Warehouse"]) {
    const response = await createAnalyticsDrillthroughGetHandler({
      getCurrentUser: async () => ({ id: "admin", role: "admin" }),
      canViewAnalytics: () => true,
      getDrillthroughData: async () => emptyResult,
    })(request(query));
    assert.equal(response.status, 400);
  }
});

test("fails closed for an unassigned regional moderator", async () => {
  let calls = 0;
  const response = await createAnalyticsDrillthroughGetHandler({
    getCurrentUser: async () => ({ id: "m1", role: "moderator", region: null, assignedAgency: null }),
    canViewAnalytics: () => true,
    getDrillthroughData: async () => {
      calls += 1;
      return emptyResult;
    },
  })(request("?health=delayed"));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

import assert from "node:assert/strict";
import test from "node:test";

import { createCostByRegionGetHandler } from "./route";

const emptyResult = {
  asOf: "2026-08-26",
  projectType: "Greenhouse",
  nationwide: { total: 0, medianBudget: null, p25Budget: null, p75Budget: null },
  regions: [],
};

function request(query = "") {
  return new Request(`http://localhost/api/admin/analytics/cost-by-region${query}`);
}

test("requires authentication and analytics permission for cost-by-region", async () => {
  const unauthenticated = await createCostByRegionGetHandler({
    getCurrentUser: async () => null,
    canViewAnalytics: () => false,
    getCostByRegion: async () => emptyResult,
  })(request("?facilityType=Greenhouse"));
  assert.equal(unauthenticated.status, 401);

  const forbidden = await createCostByRegionGetHandler({
    getCurrentUser: async () => ({ id: "citizen", role: "citizen" }),
    canViewAnalytics: () => false,
    getCostByRegion: async () => emptyResult,
  })(request("?facilityType=Greenhouse"));
  assert.equal(forbidden.status, 403);
});

test("passes the requested project type and dashboard filters to the scoped service", async () => {
  const moderator = { id: "m1", role: "moderator", region: "Region VIII", assignedAgency: "AMEFIP" };
  let received: unknown;
  const response = await createCostByRegionGetHandler({
    getCurrentUser: async () => moderator,
    canViewAnalytics: () => true,
    getCostByRegion: async (filters, user, projectType) => {
      received = { filters, user, projectType };
      return emptyResult;
    },
  })(request("?region=Region+VIII&facilityType=Greenhouse"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(received, {
    filters: { region: "Region VIII" },
    user: moderator,
    projectType: "Greenhouse",
  });
});

test("rejects a missing project type", async () => {
  const response = await createCostByRegionGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getCostByRegion: async () => emptyResult,
  })(request(""));
  assert.equal(response.status, 400);
});

test("fails closed for an unassigned regional moderator", async () => {
  let calls = 0;
  const response = await createCostByRegionGetHandler({
    getCurrentUser: async () => ({ id: "m1", role: "moderator", region: null, assignedAgency: null }),
    canViewAnalytics: () => true,
    getCostByRegion: async () => {
      calls += 1;
      return emptyResult;
    },
  })(request("?facilityType=Greenhouse"));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

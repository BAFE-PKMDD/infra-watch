import assert from "node:assert/strict";
import { test } from "bun:test";

import { createAnalyticsBreakdownGetHandler } from "./route";

const emptyResult = {
  asOf: "2026-08-26",
  dimension: "province" as const,
  rows: [],
};

function request(query = "") {
  return new Request(`http://localhost/api/admin/analytics/breakdown${query}`);
}

test("requires authentication and analytics permission for chart breakdown", async () => {
  const unauthenticated = await createAnalyticsBreakdownGetHandler({
    getCurrentUser: async () => null,
    canViewAnalytics: () => false,
    getBreakdownData: async () => emptyResult,
  })(request("?dimension=province"));
  assert.equal(unauthenticated.status, 401);

  const forbidden = await createAnalyticsBreakdownGetHandler({
    getCurrentUser: async () => ({ id: "citizen", role: "citizen" }),
    canViewAnalytics: () => false,
    getBreakdownData: async () => emptyResult,
  })(request("?dimension=province"));
  assert.equal(forbidden.status, 403);
});

test("passes validated chart filters and the requested dimension to the scoped service", async () => {
  const moderator = { id: "m1", role: "moderator", region: "Region VIII", assignedAgency: "AMEFIP" };
  let received: unknown;
  const response = await createAnalyticsBreakdownGetHandler({
    getCurrentUser: async () => moderator,
    canViewAnalytics: () => true,
    getBreakdownData: async (filters, user, dimension) => {
      received = { filters, user, dimension };
      return emptyResult;
    },
  })(request("?region=Region+VIII&health=delayed&dimension=province"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(received, {
    filters: { region: "Region VIII", health: "delayed" },
    user: moderator,
    dimension: "province",
  });
});

test("rejects a missing or invalid breakdown dimension", async () => {
  for (const query of ["", "?dimension=region", "?dimension=county"]) {
    const response = await createAnalyticsBreakdownGetHandler({
      getCurrentUser: async () => ({ id: "admin", role: "admin" }),
      canViewAnalytics: () => true,
      getBreakdownData: async () => emptyResult,
    })(request(query));
    assert.equal(response.status, 400);
  }
});

test("fails closed for an unassigned regional moderator", async () => {
  let calls = 0;
  const response = await createAnalyticsBreakdownGetHandler({
    getCurrentUser: async () => ({ id: "m1", role: "moderator", region: null, assignedAgency: null }),
    canViewAnalytics: () => true,
    getBreakdownData: async () => {
      calls += 1;
      return emptyResult;
    },
  })(request("?dimension=program"));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

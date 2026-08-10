import assert from "node:assert/strict";
import test from "node:test";

import { DashboardScopeTooLargeError } from "@/lib/analytics/managerial-dashboard-query";
import { createAnalyticsGetHandler } from "./route";

const emptyData = {
  asOf: "2026-08-10",
  freshness: {
    lastSuccessfulSyncAt: null,
    latestSyncStatus: null,
    isStale: true,
    staleAfterHours: 26,
  },
  coverage: {
    total: 0,
    withBudget: 0,
    withApprovedBudgetForContract: 0,
    withSchedule: 0,
    withPhysicalProgress: 0,
    withFinancialData: 0,
  },
  kpis: {
    totalProjects: 0,
    allocatedBudget: 0,
    approvedBudgetForContract: 0,
    completionRate: 0,
    delayedProjects: 0,
    atRiskProjects: 0,
  },
  scheduleHealth: [],
  regions: [],
  projectTypes: [],
  progressVariance: [],
  priorityProjects: [],
  insights: [],
  filterOptions: {
    programs: [],
    years: [],
    regions: [],
    provinces: [],
    projectTypes: [],
    statuses: [],
  },
};

function request(query = "") {
  return new Request(`http://localhost/api/admin/analytics${query}`);
}

test("returns 401 for an unauthenticated request", async () => {
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => null,
    canViewAnalytics: () => false,
    getDashboardData: async () => emptyData,
  })(request());
  assert.equal(response.status, 401);
});

test("returns 403 when the signed-in role lacks analytics:view", async () => {
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => ({ id: "citizen", role: "citizen" }),
    canViewAnalytics: () => false,
    getDashboardData: async () => emptyData,
  })(request());
  assert.equal(response.status, 403);
});

test("returns 400 for invalid filters without echoing unsafe input", async () => {
  const unsafe = "<script>alert(1)</script>";
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getDashboardData: async () => emptyData,
  })(request(`?health=${encodeURIComponent(unsafe)}`));
  assert.equal(response.status, 400);
  assert.doesNotMatch(await response.text(), /script|alert/i);
});

test("returns a stable no-store response for an admin", async () => {
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getDashboardData: async () => emptyData,
  })(request("?program=AMEFIP"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { success: true, data: emptyData });
});

test("passes a scoped moderator and validated filters to the service", async () => {
  const moderator = {
    id: "moderator",
    role: "moderator",
    region: "08",
    assignedAgency: "AMEFIP",
  };
  let serviceCall: unknown;
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => moderator,
    canViewAnalytics: () => true,
    getDashboardData: async (filters, user) => {
      serviceCall = { filters, user };
      return emptyData;
    },
  })(request("?year=Unknown&region=Unknown&health=atRisk"));
  assert.equal(response.status, 200);
  assert.deepEqual(serviceCall, {
    filters: { year: "Unknown", region: "Unknown", health: "atRisk" },
    user: moderator,
  });
});

test("rejects an unassigned moderator without querying portfolio analytics", async () => {
  for (const moderator of [
    { id: "unassigned", role: "moderator", region: null, assignedAgency: null },
    { id: "blank", role: "moderator", region: " ", assignedAgency: "\t" },
  ]) {
    let serviceCalls = 0;
    const response = await createAnalyticsGetHandler({
      getCurrentUser: async () => moderator,
      canViewAnalytics: () => true,
      getDashboardData: async () => {
        serviceCalls += 1;
        return emptyData;
      },
    })(request());

    assert.equal(response.status, 403);
    assert.equal(serviceCalls, 0);
  }
});

test("returns a generic 500 without SQL, secrets, or stack details", async () => {
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getDashboardData: async () => {
      throw new Error("password=secret SELECT * FROM projects");
    },
  })(request());
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /Unable to load dashboard analytics/);
  assert.doesNotMatch(body, /password|secret|select|projects/i);
});

test("asks managers to narrow an oversized scope without returning partial totals", async () => {
  const response = await createAnalyticsGetHandler({
    getCurrentUser: async () => ({ id: "admin", role: "admin" }),
    canViewAnalytics: () => true,
    getDashboardData: async () => {
      throw new DashboardScopeTooLargeError();
    },
  })(request());
  assert.equal(response.status, 422);
  assert.match(await response.text(), /narrow the filters/i);
});

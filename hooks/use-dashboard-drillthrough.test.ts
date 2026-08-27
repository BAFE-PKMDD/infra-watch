import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardDrillthroughQueryKey,
  fetchDashboardDrillthrough,
} from "./use-dashboard-drillthrough";

test("isolates drill-through cache entries by viewer, filters, and page", () => {
  assert.deepEqual(
    dashboardDrillthroughQueryKey({ region: "Region VIII", health: "delayed" }, "moderator-1", 2),
    ["managerial-dashboard-drillthrough", "moderator-1", "region=Region+VIII&health=delayed", 2],
  );
  assert.notDeepEqual(
    dashboardDrillthroughQueryKey({}, "admin-1", 1),
    dashboardDrillthroughQueryKey({}, "moderator-1", 1),
  );
});

test("fetches bounded drill-through pages from the protected analytics endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; cache?: RequestCache } | undefined;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    request = { url: String(input), cache: init?.cache };
    return new Response(JSON.stringify({
      success: true,
      data: { asOf: "2026-08-26", total: 0, page: 3, pageSize: 25, projects: [] },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await fetchDashboardDrillthrough(
      {},
      3,
      undefined,
      { otherProjectTypes: { excluded: ["Warehouse", "Diversion Dam"] } },
    );
    assert.equal(result.page, 3);
    assert.deepEqual(request, {
      url: "/api/admin/analytics/drillthrough?page=3&pageSize=25&projectTypeGroup=otherProjectTypes&excludeProjectType=Warehouse&excludeProjectType=Diversion+Dam",
      cache: "no-store",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

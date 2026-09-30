import assert from "node:assert/strict";
import { test } from "bun:test";

import { createCitizenEngagementAnalyticsGetHandler } from "./route";

const analytics = {
  range: { from: "2026-09-01", to: "2026-09-22", earliestAvailable: "2026-06-25", timeZone: "Asia/Manila", maximumDays: 90 },
};

function request(query = "") {
  return new Request(`https://infra-watch.bafe.gov.ph/api/admin/citizen-engagement${query}`);
}

test("returns analytics to an authorized administrator", async () => {
  let received: unknown;
  const response = await createCitizenEngagementAnalyticsGetHandler({
    authorize: async () => undefined,
    loadAnalytics: async (range) => { received = range; return analytics as never; },
  })(request("?from=2026-09-01&to=2026-09-22"));

  assert.equal(response.status, 200);
  assert.deepEqual(received, { from: "2026-09-01", to: "2026-09-22" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("returns 401 when the session is missing", async () => {
  const response = await createCitizenEngagementAnalyticsGetHandler({
    authorize: async () => { throw new Error("Unauthorized: You must be logged in."); },
    loadAnalytics: async () => analytics as never,
  })(request());
  assert.equal(response.status, 401);
});

test("returns 403 when the role is not allowed", async () => {
  const response = await createCitizenEngagementAnalyticsGetHandler({
    authorize: async () => { throw new Error("Forbidden: Administrator privileges required."); },
    loadAnalytics: async () => analytics as never,
  })(request());
  assert.equal(response.status, 403);
});

test("returns 400 for an invalid date range", async () => {
  const response = await createCitizenEngagementAnalyticsGetHandler({
    authorize: async () => undefined,
    loadAnalytics: async () => { throw new Error("The analytics range cannot exceed 90 days."); },
  })(request("?from=2026-01-01&to=2026-09-22"));
  assert.equal(response.status, 400);
});

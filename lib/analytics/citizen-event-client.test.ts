import assert from "node:assert/strict";
import test from "node:test";

import { inferProjectEntrySurface, sendCitizenEngagementEvent } from "./citizen-event-client";

test("posts only the supplied allowlisted event payload with keepalive", async () => {
  let captured: { input: string | URL | Request; init?: RequestInit } | undefined;
  const accepted = await sendCitizenEngagementEvent(
    {
      eventName: "map_project_opened",
      routeTemplate: "/projects",
      resourceId: "AMEFIP-001",
      entrySurface: "map",
    },
    async (input, init) => {
      captured = { input, init };
      return new Response(null, { status: 202 });
    },
  );

  assert.equal(accepted, true);
  assert.equal(captured?.input, "/api/analytics/events");
  assert.equal(captured?.init?.method, "POST");
  assert.equal(captured?.init?.keepalive, true);
  assert.deepEqual(JSON.parse(String(captured?.init?.body)), {
    eventName: "map_project_opened",
    routeTemplate: "/projects",
    resourceId: "AMEFIP-001",
    entrySurface: "map",
  });
});

test("infers dedicated map, directory map, search, directory, and direct entry surfaces", () => {
  assert.equal(inferProjectEntrySurface("/map"), "map");
  assert.equal(inferProjectEntrySurface("/projects?view=map"), "map");
  assert.equal(inferProjectEntrySurface("/projects?q=irrigation"), "search");
  assert.equal(inferProjectEntrySurface("/projects"), "directory");
  assert.equal(inferProjectEntrySurface(null), "direct");
});

test("contains network failures", async () => {
  const accepted = await sendCitizenEngagementEvent(
    {
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
    },
    async () => { throw new Error("offline"); },
  );

  assert.equal(accepted, false);
});

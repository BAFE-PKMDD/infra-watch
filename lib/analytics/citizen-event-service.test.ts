import assert from "node:assert/strict";
import { test } from "bun:test";

import { recordCitizenEngagementEvent } from "./citizen-event-service";

test("stores only normalized anonymous event fields", async () => {
  const inserted: unknown[] = [];
  const result = await recordCitizenEngagementEvent({
    input: {
      eventName: "project_viewed",
      routeTemplate: "/projects/[id]",
      resourceId: "AMEFIP-001",
      entrySurface: "directory",
    },
    role: "citizen",
    isKnownProject: async () => true,
    insertEvent: async (event) => { inserted.push(event); },
  });

  assert.equal(result, "recorded");
  assert.deepEqual(inserted, [{
    eventName: "project_viewed",
    routeTemplate: "/projects/[id]",
    resourceType: "project",
    resourceId: "AMEFIP-001",
    entrySurface: "directory",
    resultCountBand: null,
  }]);
});

test("stores only a server-derived coarse region and never accepts client geography", async () => {
  const inserted: unknown[] = [];
  const recorded = await recordCitizenEngagementEvent({
    input: { eventName: "map_viewed", routeTemplate: "/projects", entrySurface: "map" },
    role: null,
    resolveNetworkRegion: async () => ({ code: "PH130000000", label: "NCR" }),
    insertEvent: async (event) => { inserted.push(event); },
  });
  const rejected = await recordCitizenEngagementEvent({
    input: {
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
      networkRegionCode: "PH130000000",
      ip: "113.19.89.117",
    },
    role: null,
    insertEvent: async () => { throw new Error("must not run"); },
  });

  assert.equal(recorded, "recorded");
  assert.deepEqual(inserted, [{
    eventName: "map_viewed",
    routeTemplate: "/projects",
    resourceType: null,
    resourceId: null,
    entrySurface: "map",
    resultCountBand: null,
    networkRegionCode: "PH130000000",
  }]);
  assert.equal(rejected, "invalid");
  assert.equal(JSON.stringify(inserted).includes("113.19.89.117"), false);
});

test("skips known staff traffic", async () => {
  let called = false;
  const result = await recordCitizenEngagementEvent({
    input: {
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
    },
    role: "regional_admin",
    insertEvent: async () => { called = true; },
  });

  assert.equal(result, "excluded");
  assert.equal(called, false);
});

test("skips traffic when session resolution is unavailable", async () => {
  let called = false;
  const result = await recordCitizenEngagementEvent({
    input: { eventName: "map_viewed", routeTemplate: "/projects", entrySurface: "map" },
    role: undefined,
    insertEvent: async () => { called = true; },
  });

  assert.equal(result, "excluded");
  assert.equal(called, false);
});

test("rejects project events whose canonical project id does not exist", async () => {
  let called = false;
  let resolved = false;
  const result = await recordCitizenEngagementEvent({
    input: {
      eventName: "project_viewed",
      routeTemplate: "/projects/[id]",
      resourceId: "private text masquerading as an id",
      entrySurface: "direct",
    },
    role: null,
    isKnownProject: async () => false,
    resolveNetworkRegion: async () => { resolved = true; return null; },
    insertEvent: async () => { called = true; },
  });

  assert.equal(result, "invalid");
  assert.equal(called, false);
  assert.equal(resolved, false);
});

test("returns invalid without throwing for malformed public payloads", async () => {
  const result = await recordCitizenEngagementEvent({
    input: {
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
      query: "private search text",
    },
    role: null,
    insertEvent: async () => { throw new Error("must not run"); },
  });

  assert.equal(result, "invalid");
});

test("contains persistence failures so analytics cannot block public flows", async () => {
  const result = await recordCitizenEngagementEvent({
    input: {
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
    },
    role: null,
    insertEvent: async () => { throw new Error("database unavailable"); },
    reportError: () => undefined,
  });

  assert.equal(result, "unavailable");
});

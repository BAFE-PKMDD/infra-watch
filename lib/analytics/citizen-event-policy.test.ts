import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  normalizeCitizenEngagementEvent,
  shouldExcludeAnalyticsRole,
} from "./citizen-event-policy";

test("normalizes a completed project search without retaining the raw query", () => {
  const event = normalizeCitizenEngagementEvent({
    eventName: "project_search_completed",
    routeTemplate: "/projects",
    entrySurface: "directory",
    resultCount: 17,
  });

  assert.deepEqual(event, {
    eventName: "project_search_completed",
    routeTemplate: "/projects",
    resourceType: null,
    resourceId: null,
    entrySurface: "directory",
    resultCountBand: "11_50",
  });
  assert.equal("query" in event, false);
});

test("requires a stable project id for project engagement", () => {
  assert.throws(
    () => normalizeCitizenEngagementEvent({
      eventName: "project_viewed",
      routeTemplate: "/projects/[id]",
      entrySurface: "directory",
    }),
    /resourceId/i,
  );
});

test("rejects unexpected privacy-sensitive properties", () => {
  for (const forbidden of [
    { query: "sensitive search text" },
    { ipAddress: "192.0.2.1" },
    { userAgent: "browser" },
    { comment: "private complaint" },
    { latitude: 14.5 },
    { visitorId: "persistent-id" },
  ]) {
    assert.throws(
      () => normalizeCitizenEngagementEvent({
        eventName: "map_viewed",
        routeTemplate: "/projects",
        entrySurface: "map",
        ...forbidden,
      }),
      /unrecognized|invalid/i,
    );
  }
});

test("rejects route and entry-surface combinations that contradict the event contract", () => {
  assert.throws(() => normalizeCitizenEngagementEvent({
    eventName: "project_opened_from_search",
    routeTemplate: "/projects/[id]",
    resourceId: "P-1",
    entrySurface: "direct",
  }), /route|surface/i);
  assert.throws(() => normalizeCitizenEngagementEvent({
    eventName: "project_search_completed",
    routeTemplate: "/projects",
    resourceType: "project",
    entrySurface: "directory",
    resultCount: 4,
  }), /resource/i);
});

test("accepts dedicated map views and marker opens", () => {
  assert.deepEqual(normalizeCitizenEngagementEvent({
    eventName: "map_viewed",
    routeTemplate: "/map",
    entrySurface: "map",
  }), {
    eventName: "map_viewed",
    routeTemplate: "/map",
    resourceType: null,
    resourceId: null,
    entrySurface: "map",
    resultCountBand: null,
  });
  assert.equal(normalizeCitizenEngagementEvent({
    eventName: "map_project_opened",
    routeTemplate: "/map",
    resourceId: "AMEFIP-1",
    entrySurface: "map",
  }).resourceId, "AMEFIP-1");
});

test("maps result counts into controlled bands", () => {
  const expected = new Map([
    [0, "0"],
    [1, "1_10"],
    [10, "1_10"],
    [11, "11_50"],
    [50, "11_50"],
    [51, "51_plus"],
  ]);

  for (const [resultCount, resultCountBand] of expected) {
    assert.equal(
      normalizeCitizenEngagementEvent({
        eventName: "project_search_completed",
        routeTemplate: "/projects",
        entrySurface: "directory",
        resultCount,
      }).resultCountBand,
      resultCountBand,
    );
  }
});

test("excludes known staff roles but keeps anonymous and citizen activity", () => {
  assert.equal(shouldExcludeAnalyticsRole("admin"), true);
  assert.equal(shouldExcludeAnalyticsRole("regional_admin"), true);
  assert.equal(shouldExcludeAnalyticsRole("moderator"), true);
  assert.equal(shouldExcludeAnalyticsRole("citizen"), false);
  assert.equal(shouldExcludeAnalyticsRole(null), false);
});

const VISIT_KEY = "3f1c2a9e-8b4d-4e6a-9c1f-2b7d5a0e4c11";

test("accepts an anonymous site visit with a random session token", () => {
  assert.deepEqual(normalizeCitizenEngagementEvent({
    eventName: "site_visit",
    routeTemplate: "/",
    entrySurface: "landing",
    visitKey: VISIT_KEY.toUpperCase(),
  }), {
    eventName: "site_visit",
    routeTemplate: "/",
    resourceType: null,
    resourceId: null,
    entrySurface: "landing",
    resultCountBand: null,
    visitKey: VISIT_KEY,
  });
  assert.equal(normalizeCitizenEngagementEvent({
    eventName: "site_visit",
    routeTemplate: "other",
    entrySurface: "landing",
    visitKey: VISIT_KEY,
  }).routeTemplate, "other");
});

test("site visits require a well-formed token and the landing surface", () => {
  const base = { eventName: "site_visit", routeTemplate: "/", entrySurface: "landing" };
  assert.throws(() => normalizeCitizenEngagementEvent(base), /visitKey/i);
  assert.throws(() => normalizeCitizenEngagementEvent({ ...base, visitKey: "192.0.2.1" }), /invalid|visitKey/i);
  assert.throws(() => normalizeCitizenEngagementEvent({ ...base, visitKey: "user@example.com" }), /invalid|visitKey/i);
  assert.throws(() => normalizeCitizenEngagementEvent({ ...base, entrySurface: "direct", visitKey: VISIT_KEY }), /surface/i);
  assert.throws(() => normalizeCitizenEngagementEvent({ ...base, resourceId: "P-1", visitKey: VISIT_KEY }), /resource/i);
});

test("only site visits may carry a visit token or a generic route template", () => {
  assert.throws(() => normalizeCitizenEngagementEvent({
    eventName: "map_viewed",
    routeTemplate: "/map",
    entrySurface: "map",
    visitKey: VISIT_KEY,
  }), /visitKey/i);
  assert.throws(() => normalizeCitizenEngagementEvent({
    eventName: "map_viewed",
    routeTemplate: "other",
    entrySurface: "map",
  }), /route/i);
  assert.throws(() => normalizeCitizenEngagementEvent({
    eventName: "project_search_completed",
    routeTemplate: "/",
    entrySurface: "directory",
    resultCount: 1,
  }), /route/i);
});

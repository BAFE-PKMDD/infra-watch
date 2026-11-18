import assert from "node:assert/strict";
import { beforeEach, test } from "bun:test";

import {
  claimSiteVisitKey,
  reportSiteVisit,
  resetSiteVisitMemoryForTests,
  routeTemplateForPathname,
} from "./site-visit-client";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

beforeEach(() => resetSiteVisitMemoryForTests());

test("classifies public pathnames into bounded route templates", () => {
  assert.equal(routeTemplateForPathname("/"), "/");
  assert.equal(routeTemplateForPathname("/projects"), "/projects");
  assert.equal(routeTemplateForPathname("/projects/"), "/projects");
  assert.equal(routeTemplateForPathname("/projects/AMEFIP-1"), "/projects/[id]");
  assert.equal(routeTemplateForPathname("/projects/AMEFIP-1?return=/map"), "/projects/[id]");
  assert.equal(routeTemplateForPathname("/map"), "/map");
  assert.equal(routeTemplateForPathname("/faq"), "other");
  assert.equal(routeTemplateForPathname("/projects/AMEFIP-1/photos"), "other");
});

test("issues one visit token per browser session", () => {
  const storage = memoryStorage();
  const first = claimSiteVisitKey(storage, () => "key-1");
  assert.equal(first, "key-1");
  assert.equal(claimSiteVisitKey(storage, () => "key-2"), null);
});

test("falls back to an in-memory token when session storage throws", () => {
  const broken = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  };
  assert.equal(claimSiteVisitKey(broken, () => "memory-1"), "memory-1");
  assert.equal(claimSiteVisitKey(broken, () => "memory-2"), null);
});

test("reports a single site visit with the landing surface and no identifying fields", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  try {
    const storage = memoryStorage();
    assert.equal(await reportSiteVisit("/projects/AMEFIP-1", storage), true);
    assert.equal(await reportSiteVisit("/map", storage), false);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/analytics/events");
  const body = requests[0].body;
  assert.deepEqual(Object.keys(body).sort(), ["entrySurface", "eventName", "routeTemplate", "visitKey"]);
  assert.equal(body.eventName, "site_visit");
  assert.equal(body.routeTemplate, "/projects/[id]");
  assert.equal(body.entrySurface, "landing");
  assert.match(String(body.visitKey), /^[0-9a-f-]{36}$/i);
});

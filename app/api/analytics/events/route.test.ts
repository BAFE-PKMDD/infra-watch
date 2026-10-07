import assert from "node:assert/strict";
import { test } from "bun:test";

import { createCitizenEventPostHandler } from "./route";

function request(body: unknown, origin = "https://infra-watch.bafe.gov.ph") {
  return new Request("https://infra-watch.bafe.gov.ph/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

const validMapEvent = {
  eventName: "map_viewed",
  routeTemplate: "/projects",
  entrySurface: "map",
};

test("accepts a valid anonymous event", async () => {
  let capturedRole: string | null | undefined;
  let capturedRegion: string | null | undefined;
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    resolveNetworkRegion: async () => ({ code: "PH130000000", label: "NCR" }),
    recordEvent: async (_input, role, resolveNetworkRegion) => {
      capturedRole = role;
      capturedRegion = (await resolveNetworkRegion?.())?.code;
      return "recorded";
    },
  })(request(validMapEvent));

  assert.equal(response.status, 202);
  assert.equal(capturedRole, null);
  assert.equal(capturedRegion, "PH130000000");
});

test("rejects cross-origin or origin-less event submissions", async () => {
  let called = false;
  const handler = createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => { called = true; return "recorded"; },
  });
  const crossOriginResponse = await handler(request(validMapEvent, "https://attacker.example"));
  const originlessResponse = await handler(new Request("https://infra-watch.bafe.gov.ph/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validMapEvent),
  }));

  assert.equal(crossOriginResponse.status, 403);
  assert.equal(originlessResponse.status, 403);
  assert.equal(called, false);
});

test("accepts the https origin when a TLS-terminating proxy makes request.url http", async () => {
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => "recorded",
  })(new Request("http://infra-watch.bafe.gov.ph/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://infra-watch.bafe.gov.ph",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify(validMapEvent),
  }));

  assert.equal(response.status, 202);
});

test("rejects a forwarded-scheme request from a different host", async () => {
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => "recorded",
  })(new Request("http://infra-watch.bafe.gov.ph/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.example",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify(validMapEvent),
  }));

  assert.equal(response.status, 403);
});

test("rejects invalid or privacy-sensitive payloads", async () => {
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => "invalid",
  })(request({ ...validMapEvent, query: "private text" }));

  assert.equal(response.status, 400);
});

test("rejects oversized chunked bodies before consuming the full stream", async () => {
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls <= 2) {
        controller.enqueue(new Uint8Array(3_000).fill(32));
        return;
      }
      throw new Error("the bounded reader should have cancelled before this chunk");
    },
  });
  const oversizedRequest = new Request("https://infra-watch.bafe.gov.ph/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://infra-watch.bafe.gov.ph",
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => "recorded",
  })(oversizedRequest);

  assert.equal(response.status, 413);
  assert.equal(pulls, 2);
});

test("silently drops events when the global pressure limit is reached", async () => {
  let called = false;
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => { called = true; return "recorded"; },
    allowRequest: () => false,
  })(request(validMapEvent));

  assert.equal(response.status, 202);
  assert.equal(called, false);
});

test("does not expose storage outages to public workflows", async () => {
  const response = await createCitizenEventPostHandler({
    getRole: async () => null,
    recordEvent: async () => "unavailable",
  })(request(validMapEvent));

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: true });
});

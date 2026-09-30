import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  extractTrustedPublicIp,
  hasTrustedAnalyticsProxy,
  resolveApproximateNetworkRegion,
} from "./citizen-network-region";

test("requires both explicit trust and the proxy secret", () => {
  const secret = "server-secret-with-at-least-32-bytes";
  const headers = new Headers({ "x-infrawatch-proxy-secret": secret });
  assert.equal(hasTrustedAnalyticsProxy(headers, false, secret), false);
  assert.equal(hasTrustedAnalyticsProxy(headers, true, ""), false);
  assert.equal(hasTrustedAnalyticsProxy(headers, true, "wrong-secret"), false);
  assert.equal(hasTrustedAnalyticsProxy(headers, true, secret), true);
});

test("reads only explicitly trusted proxy headers and prefers x-real-ip", () => {
  const headers = new Headers({
    "x-real-ip": "113.19.89.117",
    "x-forwarded-for": "198.51.100.8, 203.0.113.9",
  });

  assert.equal(extractTrustedPublicIp(headers, false), null);
  assert.equal(extractTrustedPublicIp(headers, true), "113.19.89.117");
});

test("rejects private, loopback, malformed, and documentation addresses", () => {
  for (const value of ["127.0.0.1", "10.0.0.1", "172.16.1.1", "192.168.1.1", "192.0.2.5", "::1", "not-an-ip"]) {
    assert.equal(extractTrustedPublicIp(new Headers({ "x-real-ip": value }), true), null);
  }
});

test("uses the final forwarded address when x-real-ip is absent", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.8, 113.19.89.117" });
  assert.equal(extractTrustedPublicIp(headers, true), "113.19.89.117");
});

test("reduces a Philippine lookup to a canonical region code", async () => {
  const seen: string[] = [];
  const result = await resolveApproximateNetworkRegion({
    ip: "113.19.89.117",
    lookup: async (ip) => {
      seen.push(ip);
      return { countryCode: "PH", subdivisionNames: ["Metro Manila"] };
    },
    findCanonicalRegion: async (name) => name === "Metro Manila"
      ? { code: "PH130000000", label: "National Capital Region (NCR)" }
      : null,
  });

  assert.deepEqual(seen, ["113.19.89.117"]);
  assert.deepEqual(result, {
    code: "PH130000000",
    label: "National Capital Region (NCR)",
  });
  assert.equal("ip" in result!, false);
});

test("contains lookup failures so geography cannot block public events", async () => {
  const result = await resolveApproximateNetworkRegion({
    ip: "113.19.89.117",
    lookup: async () => { throw new Error("database unavailable"); },
    findCanonicalRegion: async () => ({ code: "PH130000000", label: "NCR" }),
  });
  assert.equal(result, null);
});

test("does not infer geography for foreign or unmatched lookups", async () => {
  const foreign = await resolveApproximateNetworkRegion({
    ip: "8.8.8.8",
    lookup: async () => ({ countryCode: "US", subdivisionNames: ["California"] }),
    findCanonicalRegion: async () => ({ code: "PH130000000", label: "NCR" }),
  });
  const unmatched = await resolveApproximateNetworkRegion({
    ip: "113.19.89.117",
    lookup: async () => ({ countryCode: "PH", subdivisionNames: ["Unknown"] }),
    findCanonicalRegion: async () => null,
  });

  assert.equal(foreign, null);
  assert.equal(unmatched, null);
});

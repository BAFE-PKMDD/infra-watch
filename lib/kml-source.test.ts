import assert from "node:assert/strict";
import { test } from "bun:test";

import { assertPublicKmlUrl, fetchKml, isPrivateAddress, KmlSourceError, MAX_KML_BYTES } from "./kml-source";

const publicHost = async () => ["93.184.216.34"];

test("classifies private, loopback and link-local addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("93.184.216.34"), false);
  assert.equal(isPrivateAddress("172.32.0.1"), false);
});

test("rejects non-http schemes, credentials, localhost and private resolutions", async () => {
  await assert.rejects(assertPublicKmlUrl("file:///etc/passwd", publicHost), KmlSourceError);
  await assert.rejects(assertPublicKmlUrl("https://user:pw@example.com/a.kml", publicHost), KmlSourceError);
  await assert.rejects(assertPublicKmlUrl("http://localhost:9000/a.kml", publicHost), KmlSourceError);
  await assert.rejects(assertPublicKmlUrl("http://169.254.169.254/latest/meta-data", publicHost), KmlSourceError);
  await assert.rejects(assertPublicKmlUrl("https://rebind.example/a.kml", async () => ["10.0.0.5"]), KmlSourceError);
  await assertPublicKmlUrl("https://example.com/a.kml", publicHost);
});

test("re-validates redirect targets", async () => {
  const fetcher = (async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } })) as unknown as typeof fetch;
  await assert.rejects(fetchKml("https://example.com/a.kml", { fetch: fetcher, resolve: publicHost }), KmlSourceError);
});

test("returns the body and rejects oversized responses", async () => {
  const ok = (async () => new Response("<kml/>")) as unknown as typeof fetch;
  assert.equal(await fetchKml("https://example.com/a.kml", { fetch: ok, resolve: publicHost }), "<kml/>");
  const big = (async () => new Response(new Uint8Array(MAX_KML_BYTES + 1))) as unknown as typeof fetch;
  await assert.rejects(fetchKml("https://example.com/a.kml", { fetch: big, resolve: publicHost }), /too large/);
});

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import { buildUrl, fetchAbemisResponse, resolveInfraEndpoint } from "./client";

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("defaults infrastructure synchronization to the AMEFIP endpoint", () => {
  const endpoint = resolveInfraEndpoint(undefined);
  assert.equal(endpoint, "/api/infra-amefip-list");
  assert.equal(buildUrl(endpoint, "https://abemis.bafe.gov.ph").href, "https://abemis.bafe.gov.ph/api/infra-amefip-list");
  assert.equal(resolveInfraEndpoint(""), "/api/infra-amefip-list");
});

test("allows an explicitly configured infrastructure endpoint", () => {
  assert.equal(resolveInfraEndpoint(" /api/custom-infra-list "), "/api/custom-infra-list");
});

test("rejects endpoint overrides that could send the API key to another origin", () => {
  assert.throws(() => resolveInfraEndpoint("https://example.com/api/infra-list"), /root-relative path/);
  assert.throws(() => resolveInfraEndpoint("//example.com/api/infra-list"), /root-relative path/);
  assert.throws(() => resolveInfraEndpoint("\\\\example.com\\api\\infra-list"), /root-relative path/);
  assert.throws(() => resolveInfraEndpoint("/\t/example.com/api/infra-list"), /root-relative path/);
  assert.throws(() => resolveInfraEndpoint("/\n/example.com/api/infra-list"), /root-relative path/);
  assert.throws(() => resolveInfraEndpoint("/\r/example.com/api/infra-list"), /root-relative path/);
  assert.throws(
    () => buildUrl("/\t/example.com/api/infra-list", "https://abemis.bafe.gov.ph"),
    /configured base URL origin/,
  );
});

test("does not forward the API key through an HTTP redirect", async () => {
  let destinationRequests = 0;
  let destinationReceivedApiKey = false;
  const destination = createServer((request, response) => {
    destinationRequests += 1;
    destinationReceivedApiKey = Boolean(request.headers["x-api-key"]);
    response.end("unexpected redirect destination");
  });
  const destinationOrigin = await listen(destination);
  const source = createServer((_request, response) => {
    response.writeHead(302, { location: `${destinationOrigin}/capture` });
    response.end();
  });
  const sourceOrigin = await listen(source);

  try {
    await assert.rejects(
      fetchAbemisResponse(new URL(`${sourceOrigin}/projects`), {
        headers: { "x-api-key": "sentinel-test-key" },
      }),
      /redirects are not allowed/,
    );
    assert.equal(destinationRequests, 0);
    assert.equal(destinationReceivedApiKey, false);
  } finally {
    await Promise.all([close(source), close(destination)]);
  }
});

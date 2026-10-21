import assert from "node:assert/strict";
import { test } from "bun:test";
import { jsonBody, apiError } from "./staff-api";

test("operational JSON readers reject cross-origin, non-JSON, oversized, and malformed bodies", async () => {
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/admin/test", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json", ...headers },
    });
  assert.deepEqual(await jsonBody(request('{"value":0}')), { value: 0 });
  for (const [input, status, limit] of [
    [request("{}", { Origin: "https://external.invalid" }), 403, 32768],
    [request("{}", { "Content-Type": "text/plain" }), 415, 32768],
    [request("invalid"), 400, 32768],
    [request('{"tooLong":true}'), 413, 4],
  ] as const) {
    try {
      await jsonBody(input, limit);
      assert.fail("Expected rejection");
    } catch (error) {
      assert.equal(apiError(error).status, status);
    }
  }
});

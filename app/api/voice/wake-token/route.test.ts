import assert from "node:assert/strict";
import test from "node:test";
import {
  createWakeTokenPostHandler,
  verifyWakeToken,
  type WakeTokenDependencies,
} from "./route";

const secret = "test-secret-that-is-long-enough";
function dependencies(overrides: Partial<WakeTokenDependencies> = {}): WakeTokenDependencies {
  return {
    isFeatureEnabled: () => true,
    getSessionUser: async () => ({ id: "admin-1", role: "admin" }),
    getSecret: () => secret,
    now: () => 1_700_000_000,
    ...overrides,
  };
}

test("wake token route requires the enabled feature and an administrator", async () => {
  assert.equal(
    (await createWakeTokenPostHandler(dependencies({ isFeatureEnabled: () => false }))(new Request("http://localhost"))).status,
    404,
  );
  assert.equal(
    (await createWakeTokenPostHandler(dependencies({ getSessionUser: async () => null }))(new Request("http://localhost"))).status,
    401,
  );
  assert.equal(
    (await createWakeTokenPostHandler(dependencies({ getSessionUser: async () => ({ id: "mod", role: "moderator" }) }))(new Request("http://localhost"))).status,
    403,
  );
});

test("issues a short-lived signed token bound to the admin user", async () => {
  const response = await createWakeTokenPostHandler(dependencies())(new Request("http://localhost"));
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { token: string; expiresAt: number };
  assert.equal(payload.expiresAt, 1_700_000_060);
  assert.deepEqual(verifyWakeToken(payload.token, secret, 1_700_000_030), {
    userId: "admin-1",
    expiresAt: 1_700_000_060,
  });
  assert.equal(verifyWakeToken(payload.token, secret, 1_700_000_061), null);
});

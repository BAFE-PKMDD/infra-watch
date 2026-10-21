import assert from "node:assert/strict";
import { test } from "bun:test";
import { cachedPublic, clearPublicCache } from "./cache";

test("public cache coalesces concurrent loads and invalidation prevents a stale in-flight value from being saved", async () => {
  if (process.env.REDIS_URL) return;
  await clearPublicCache();
  let calls = 0;
  const key = crypto.randomUUID();
  const load = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: 0 };
  };
  assert.deepEqual(
    await Promise.all([
      cachedPublic(key, 60, load),
      cachedPublic(key, 60, load),
    ]),
    [{ value: 0 }, { value: 0 }],
  );
  assert.equal(calls, 1);
  await cachedPublic(key, 60, load);
  assert.equal(calls, 1);
  let resolve!: (value: string) => void;
  const stale = cachedPublic(
    key + "race",
    60,
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  await new Promise((done) => setTimeout(done, 0));
  await clearPublicCache();
  resolve("stale");
  await stale;
  assert.equal(
    await cachedPublic(key + "race", 60, async () => "fresh"),
    "fresh",
  );
});

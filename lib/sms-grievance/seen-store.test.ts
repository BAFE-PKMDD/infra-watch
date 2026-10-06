import assert from "node:assert/strict";
import { test } from "bun:test";

import { parseSeen, withSeen } from "./seen-store";

test("parseSeen tolerates empty, corrupt and wrongly shaped storage", () => {
  assert.deepEqual(parseSeen(""), {});
  assert.deepEqual(parseSeen(null), {});
  assert.deepEqual(parseSeen("{not json"), {});
  assert.deepEqual(parseSeen("[1,2]"), {});
  assert.deepEqual(parseSeen('{"a":"2026-10-05T00:00:00.000Z","b":7}'), { a: "2026-10-05T00:00:00.000Z" });
});

test("withSeen records the newest time and returns the same map when nothing changes", () => {
  const first = withSeen({}, "m1", "2026-10-05T01:00:00.000Z");
  assert.deepEqual(first, { m1: "2026-10-05T01:00:00.000Z" });
  assert.equal(withSeen(first, "m1", "2026-10-05T00:00:00.000Z"), first);
  assert.equal(withSeen(first, "m1", "2026-10-05T01:00:00.000Z"), first);
  assert.deepEqual(withSeen(first, "m1", "2026-10-05T02:00:00.000Z"), { m1: "2026-10-05T02:00:00.000Z" });
});

test("withSeen drops the oldest entries past its cap", () => {
  let seen = {};
  for (let index = 0; index < 505; index += 1) seen = withSeen(seen, `m${index}`, "2026-10-05T00:00:00.000Z");
  const keys = Object.keys(seen);
  assert.equal(keys.length, 500);
  assert.equal(keys.includes("m0"), false);
  assert.equal(keys.includes("m504"), true);
});

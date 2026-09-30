import assert from "node:assert/strict";
import { test } from "bun:test";

import { createGlobalCitizenEventLimiter } from "./citizen-event-rate-limit";

test("bounds event ingestion without creating a visitor identity", () => {
  let now = 1_000;
  const allow = createGlobalCitizenEventLimiter({ limit: 2, windowMs: 60_000, now: () => now });

  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), false);

  now += 60_001;
  assert.equal(allow(), true);
});

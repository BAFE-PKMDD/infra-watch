import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("SMS review sources its queue through the live-source module rather than fetching or hardcoding fixtures inline", () => {
  assert.match(source, /getSmsGrievanceQueue/);
  assert.doesNotMatch(source, /SMS_MOCK_SCENARIOS/);
  assert.doesNotMatch(source, /fetch\(|https?:\/\//);
});

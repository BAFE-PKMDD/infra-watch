import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("public evidence API excludes issue-sourced evidence until explicit publication approval exists", () => {
  assert.doesNotMatch(source, /\bissues\.(?:evidence|geoVideoTrack|geoVideoUrl)\b/);
  assert.doesNotMatch(source, /sourceType:\s*["']issue["']/);
  assert.match(source, /sourceType:\s*["']feedback["']/);
});

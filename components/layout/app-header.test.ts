import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./app-header.tsx", import.meta.url), "utf8");

test("does not expose the unavailable Articles & Updates route", () => {
  assert.doesNotMatch(source, /articles-and-updates/);
  assert.doesNotMatch(source, /Articles & Updates/);
});

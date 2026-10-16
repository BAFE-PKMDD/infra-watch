import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const source = readFileSync(new URL("./app-header.tsx", import.meta.url), "utf8");

test("exposes Articles & Updates after its public route is implemented", () => {
  assert.match(source, /href: "\/articles-and-updates"/);
  assert.match(source, /Articles & Updates/);
});

test("links the public header to the embedded live broadcasts page exactly once", () => {
  const liveLinks = source.match(/href: "\/live", key: "live"/g) ?? [];
  assert.equal(liveLinks.length, 1);
});

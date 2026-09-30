import assert from "node:assert/strict";
import { test } from "bun:test";

import { getPublicAnalyticsStrings, publicAnalyticsStrings } from "./strings";

function leaves(value: unknown, path = ""): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");

test("Tagalog strings have every English key and the same placeholders", () => {
  const english = leaves(publicAnalyticsStrings.en);
  const tagalog = new Map(leaves(publicAnalyticsStrings.tl));
  assert.equal(tagalog.size, english.length);
  for (const [path, text] of english) {
    assert.ok(tagalog.has(path), `missing tl.${path}`);
    assert.equal(placeholders(tagalog.get(path) ?? ""), placeholders(text), `placeholders differ at ${path}`);
  }
});

test("neither language uses the jargon the public page avoids", () => {
  const banned = /median|allotment|slippage|cumulative|s-curve|kumulatibo|alokasyon|laang-gugulin/i;
  for (const language of ["en", "tl"] as const) {
    for (const [path, text] of leaves(publicAnalyticsStrings[language])) {
      assert.doesNotMatch(text, banned, `${language}.${path}`);
    }
  }
});

test("unknown languages fall back to English", () => {
  assert.equal(getPublicAnalyticsStrings("tl"), publicAnalyticsStrings.tl);
  assert.equal(getPublicAnalyticsStrings("fr"), publicAnalyticsStrings.en);
  assert.equal(getPublicAnalyticsStrings(undefined), publicAnalyticsStrings.en);
});

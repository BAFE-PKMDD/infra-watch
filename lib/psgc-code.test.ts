import assert from "node:assert/strict";
import { test } from "bun:test";

import { normalizePsgcCode } from "./psgc-code";

test("normalizePsgcCode keeps canonical 9-digit codes", () => {
  assert.equal(normalizePsgcCode("012802001"), "012802001");
});

test("normalizePsgcCode restores a dropped leading zero", () => {
  assert.equal(normalizePsgcCode("64502011"), "064502011");
});

test("normalizePsgcCode strips surrounding whitespace", () => {
  assert.equal(normalizePsgcCode("\t012910007"), "012910007");
  assert.equal(normalizePsgcCode(" 012910007 "), "012910007");
});

test("normalizePsgcCode returns null for missing or non-numeric codes", () => {
  assert.equal(normalizePsgcCode(null), null);
  assert.equal(normalizePsgcCode(undefined), null);
  assert.equal(normalizePsgcCode(""), null);
  assert.equal(normalizePsgcCode("n/a"), null);
});

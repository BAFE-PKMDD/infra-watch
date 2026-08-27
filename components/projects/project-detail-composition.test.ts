import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync(new URL("./project-detail-client.tsx", import.meta.url), "utf8");
const highlightsSource = readFileSync(new URL("./project-highlights.tsx", import.meta.url), "utf8");

test("uses the project detail card as the first overlapping summary instead of the passport panel", () => {
  assert.doesNotMatch(detailSource, /ProjectPassport/);
  assert.match(detailSource, /-mt-14[\s\S]*<ProjectHighlights project=\{project\}/);
});

test("keeps missing project fields in their existing detail grid", () => {
  assert.match(highlightsSource, /grid-cols-1[^\"]*sm:grid-cols-2[^\"]*lg:grid-cols-4/);
  assert.match(highlightsSource, /lg:mr-20/, "keeps the fixed assistant control clear of the QR action");
  assert.match(highlightsSource, /value=\{project\.startDate\}/);
  assert.match(highlightsSource, /value=\{project\.contractor\}/);
});

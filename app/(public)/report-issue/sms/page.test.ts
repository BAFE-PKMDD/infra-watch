import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const guidePage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const directoryPage = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");

test("public SMS guide and reporting-methods chooser are always rendered, not fetched or hardcoded elsewhere", () => {
  assert.match(guidePage, /SmsGrievanceGuide/);
  assert.match(directoryPage, /<ReportingMethods \/>/);
});

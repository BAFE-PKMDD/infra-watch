import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guidePage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const directoryPage = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");

test("public SMS prototype fails closed in production", () => {
  assert.match(guidePage, /process\.env\.NODE_ENV === "production"/);
  assert.match(guidePage, /notFound\(\)/);
  assert.match(directoryPage, /process\.env\.NODE_ENV !== "production"/);
  assert.match(directoryPage, /smsPrototypeEnabled && <ReportingMethods/);
});

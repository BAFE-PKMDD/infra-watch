import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("public evidence API maps E-Reports only after staff approve a public summary", () => {
  assert.match(source, /isNotNull\(issues\.publicApprovedAt\)/);
  assert.match(source, /isNotNull\(issues\.publicDescription\)/);
  assert.match(source, /buildPublicIssueMapEntry/);
});

test("public evidence API never selects private issue fields", () => {
  const issueSelect = source.match(/\.select\(\{\s*id: issues\.id[\s\S]*?\}\)\s*\.from\(issues\)/)?.[0] ?? "";
  assert.ok(issueSelect, "issue select not found");
  assert.doesNotMatch(issueSelect, /reporter|isAnonymous|geoVideo|description: issues\.description|landmark|assignedTo/);
  assert.match(source, /sourceType:\s*["']feedback["']/);
});

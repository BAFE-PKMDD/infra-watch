import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./issue-management-view.tsx", import.meta.url), "utf8");

test("E-Report workspace does not mix in SMS prototype records", () => {
  assert.doesNotMatch(source, /SMS_MOCK_SCENARIOS/);
  assert.doesNotMatch(source, /sms_prototype/);
  assert.doesNotMatch(source, /\/issues\/sms-review/);
  assert.doesNotMatch(source, /Issue source/);
});

test("E-Report retains its searchable issue workflow and permanent-delete warning", () => {
  assert.match(source, /Search E-Reports/);
  assert.match(source, /Respond/);
  assert.match(source, /Delete E-Report\?/);
  assert.match(source, /permanently removes/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../drizzle/0012_last_obadiah_stane.sql", import.meta.url),
  "utf8",
);

test("notification migration safely upgrades databases with legacy runtime-created tables", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "notifications"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "notification_recipients"/);
  assert.match(migration, /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS/);
  assert.match(migration, /Unsafe legacy notification schema/);
  assert.match(migration, /information_schema\.columns/);
  assert.match(migration, /type\/nullability\/default/);
  assert.doesNotMatch(migration, /CREATE TABLE[^;]*"notification_reads"/);
});

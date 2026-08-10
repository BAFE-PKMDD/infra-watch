import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const nginxConfigUrl = new URL(
  "../deploy/nginx/infrawatch.bafe.gov.ph.conf",
  import.meta.url,
);
const packageJsonUrl = new URL("../package.json", import.meta.url);
const ownerMigrationUrl = new URL(
  "../drizzle/0004_add_chat_owner_key.sql",
  import.meta.url,
);

test("production Nginx disables buffering for the chat stream", async () => {
  const config = await readFile(nginxConfigUrl, "utf8");
  const chatLocation = config.match(
    /location\s+=\s+\/api\/chat\s*\{([\s\S]*?)\n\s*\}/,
  )?.[1];

  assert.ok(chatLocation, "missing dedicated /api/chat location");
  assert.match(chatLocation, /proxy_buffering\s+off\s*;/);
});

test("default migration generation preserves auth tables", async () => {
  const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.match(
    packageJson.scripts["db:generate"],
    /^DRIZZLE_INCLUDE_AUTH=true\s+/,
  );
});

test("chat owner migration backfills rows before enforcing ownership", async () => {
  const migration = await readFile(ownerMigrationUrl, "utf8");
  const addColumnAt = migration.indexOf('ADD COLUMN "owner_key" text;');
  const backfillAt = migration.indexOf('UPDATE "ai_chat_history"');
  const notNullAt = migration.indexOf(
    'ALTER COLUMN "owner_key" SET NOT NULL;',
  );

  assert.ok(addColumnAt >= 0, "owner key must start nullable");
  assert.ok(backfillAt > addColumnAt, "owner key must be backfilled");
  assert.ok(notNullAt > backfillAt, "NOT NULL must follow the backfill");
});

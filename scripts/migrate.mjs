#!/usr/bin/env bun
// Replaces `drizzle-kit migrate` for production startup. drizzle-kit's own
// migrator (drizzle-orm/pg-core/dialect.js PgDialect.migrate) wraps every
// pending migration file in one giant transaction and silently dies with no
// error output as soon as it receives a Postgres NOTICE while inside that
// transaction (observed under Bun + postgres.js on Postgres 18) - the open
// transaction then rolls back everything the run had done, so the next
// container restart repeats the same crash from scratch forever.
//
// This does the same job - same tracking table, same SHA256 hash, same
// journal format, fully drizzle-kit-compatible - but executes each
// statement individually instead of inside one transaction, and treats
// "already exists" errors as safe no-ops (equivalent to IF NOT EXISTS) so a
// database that already has some objects from a prior partial run or manual
// intervention doesn't get stuck either.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ALREADY_EXISTS_CODES = new Set([
  "42701", // duplicate_column
  "42P07", // duplicate_table
  "42P06", // duplicate_schema
  "42710", // duplicate_object (constraint/index/etc)
]);

const migrationsFolder = "drizzle";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, "utf8"));

await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;

const [last] = await sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
const lastMillis = last ? Number(last.created_at) : 0;

let applied = 0;
for (const entry of journal.entries) {
  if (entry.when <= lastMillis) continue;
  const content = readFileSync(`${migrationsFolder}/${entry.tag}.sql`, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  const statements = content.split("--> statement-breakpoint");
  console.log(`Applying ${entry.tag} (${statements.length} statements)...`);
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    try {
      await sql.unsafe(stmt);
    } catch (err) {
      if (ALREADY_EXISTS_CODES.has(err?.code)) {
        console.log(`  skipping already-applied statement (${err.code}): ${err.message}`);
        continue;
      }
      throw err;
    }
  }
  await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${entry.when})`;
  console.log(`Recorded ${entry.tag}`);
  applied++;
}

await sql.end();
console.log(applied > 0 ? `Applied ${applied} migration(s).` : "No pending migrations.");

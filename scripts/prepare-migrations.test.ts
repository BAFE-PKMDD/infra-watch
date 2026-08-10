import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  findSnapshotMismatches,
  getMigrationBaselineState,
  migrationNeedsOperatorVerification,
  migrationRequiresDataEffectVerification,
} from "./prepare-migrations";

const migrationMetaUrl = new URL("../drizzle/meta/", import.meta.url);
const migrationsUrl = new URL("../drizzle/", import.meta.url);

test("index-only migrations are verified against their snapshot", () => {
  assert.equal(getMigrationBaselineState([]), "verify-snapshot");
});

test("data-changing migrations are never auto-baselined from schema shape", () => {
  assert.equal(
    migrationRequiresDataEffectVerification(
      'UPDATE "snapshots" SET "region" = "projects"."region" FROM "projects";',
    ),
    true,
  );
  assert.equal(
    migrationRequiresDataEffectVerification(
      'DELETE FROM "snapshots" USING "snapshots" AS "newer";',
    ),
    true,
  );
  assert.equal(
    migrationRequiresDataEffectVerification(
      'CREATE INDEX "snapshot_date_idx" ON "snapshots" ("capture_date");',
    ),
    false,
  );
  assert.equal(
    migrationRequiresDataEffectVerification(
      'ALTER TABLE "account" ADD CONSTRAINT "account_user_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade;',
    ),
    false,
  );
});

test("real migration baseline stops at 0008 before 0009 data consolidation", async () => {
  const journal = JSON.parse(
    await readFile(new URL("_journal.json", migrationMetaUrl), "utf8"),
  ) as { entries: Array<{ tag: string }> };
  const decisions = await Promise.all(
    journal.entries.map(async ({ tag }) => {
      const migrationSql = await readFile(
        new URL(`${tag}.sql`, migrationsUrl),
        "utf8",
      );
      return {
        tag,
        hasDataEffects: migrationRequiresDataEffectVerification(migrationSql),
        needsOperatorVerification: migrationNeedsOperatorVerification(
          tag,
          migrationSql,
        ),
      };
    }),
  );
  const firstBlockedIndex = decisions.findIndex(
    ({ needsOperatorVerification }) => needsOperatorVerification,
  );

  assert.notEqual(firstBlockedIndex, -1);
  assert.equal(decisions[firstBlockedIndex]?.tag, "0009_classy_randall");
  assert.equal(decisions[firstBlockedIndex - 1]?.tag, "0008_stormy_lifeguard");
  const ownerKeyMigration = decisions.find(
    ({ tag }) => tag === "0004_add_chat_owner_key",
  );
  assert.equal(ownerKeyMigration?.hasDataEffects, true);
  assert.equal(ownerKeyMigration?.needsOperatorVerification, false);
});

test("rate-limit index snapshot contains no unrelated schema changes", async () => {
  const previous = JSON.parse(
    await readFile(new URL("0002_snapshot.json", migrationMetaUrl), "utf8"),
  );
  const current = JSON.parse(
    await readFile(new URL("0003_snapshot.json", migrationMetaUrl), "utf8"),
  );
  const expected = structuredClone(previous);

  expected.id = current.id;
  expected.prevId = current.prevId;
  expected.tables["public.ai_chat_rate_limits"].indexes[
    "ai_chat_rate_limits_updated_at_idx"
  ] = current.tables["public.ai_chat_rate_limits"].indexes[
    "ai_chat_rate_limits_updated_at_idx"
  ];

  assert.deepEqual(current, expected);
});

test("baseline verification rejects a same-name index on the wrong columns", async () => {
  const sql = async (strings: TemplateStringsArray) => {
    const query = strings.join("?");

    if (query.includes("to_regclass")) {
      return [{ table_name: "public.example" }];
    }
    if (query.includes("pg_catalog.pg_attribute")) {
      return [
        {
          name: "id",
          type: "text",
          not_null: true,
          default_value: null,
        },
      ];
    }
    if (query.includes("pg_catalog.pg_constraint")) {
      return [];
    }
    if (query.includes("pg_catalog.pg_index")) {
      return [
        {
          name: "example_lookup_idx",
          is_unique: false,
          columns: ["wrong_column"],
          method: "btree",
        },
      ];
    }

    throw new Error(`Unexpected query: ${query}`);
  };
  const snapshot = {
    tables: {
      "public.example": {
        name: "example",
        columns: {
          id: {
            name: "id",
            type: "text",
            primaryKey: false,
            notNull: true,
          },
        },
        indexes: {
          example_lookup_idx: {
            isUnique: false,
            method: "btree",
            columns: [{ expression: "lookup_column" }],
          },
        },
        foreignKeys: {},
        compositePrimaryKeys: {},
        uniqueConstraints: {},
        checkConstraints: {},
      },
    },
  };

  const mismatches = await findSnapshotMismatches(
    sql as never,
    snapshot as never,
  );

  assert.deepEqual(mismatches, [
    "example.example_lookup_idx:wrong-index-columns",
  ]);
});

test("baseline verification rejects the wrong index method or predicate", async () => {
  const snapshot = {
    tables: {
      "public.example": {
        name: "example",
        columns: {
          id: {
            name: "id",
            type: "text",
            primaryKey: true,
            notNull: true,
          },
        },
        indexes: {
          example_lookup_idx: {
            isUnique: false,
            method: "btree",
            columns: [{ expression: "id", asc: true, nulls: "last" }],
          },
        },
        foreignKeys: {},
        compositePrimaryKeys: {},
        uniqueConstraints: {},
        checkConstraints: {},
      },
    },
  };
  const makeSql = (method: string, predicate: string | null) =>
    async (strings: TemplateStringsArray) => {
      const query = strings.join("?");
      if (query.includes("to_regclass")) {
        return [{ table_name: "public.example" }];
      }
      if (query.includes("from pg_catalog.pg_attribute")) {
        return [
          {
            name: "id",
            type: "text",
            not_null: true,
            default_value: null,
          },
        ];
      }
      if (query.includes("from pg_catalog.pg_constraint")) return [];
      if (query.includes("from pg_catalog.pg_index")) {
        return [
          {
            name: "example_lookup_idx",
            is_unique: false,
            columns: ["id"],
            method,
            predicate,
          },
        ];
      }
      throw new Error(`Unexpected query: ${query}`);
    };

  const wrongMethod = await findSnapshotMismatches(
    makeSql("hash", null) as never,
    snapshot as never,
  );
  const wrongPredicate = await findSnapshotMismatches(
    makeSql("btree", "id IS NOT NULL") as never,
    snapshot as never,
  );

  assert.ok(
    wrongMethod.includes("example.example_lookup_idx:wrong-index-method"),
  );
  assert.ok(
    wrongPredicate.includes("example.example_lookup_idx:wrong-index-predicate"),
  );
});

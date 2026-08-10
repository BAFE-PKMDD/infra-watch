import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

type JournalEntry = {
  tag: string;
  when: number;
};

type SnapshotColumn = {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  default?: unknown;
};

type SnapshotTable = {
  name: string;
  columns: Record<string, SnapshotColumn>;
  indexes: Record<
    string,
    {
      isUnique: boolean;
      method?: string;
      where?: string;
      columns: Array<{
        expression: string;
        asc?: boolean;
        nulls?: "first" | "last";
      }>;
    }
  >;
  foreignKeys: Record<
    string,
    {
      tableTo: string;
      columnsFrom: string[];
      columnsTo: string[];
      onDelete: string;
      onUpdate: string;
    }
  >;
  compositePrimaryKeys: Record<string, { columns: string[] }>;
  uniqueConstraints: Record<string, { columns: string[] }>;
  checkConstraints: Record<string, unknown>;
};

type MigrationSnapshot = {
  tables: Record<string, SnapshotTable>;
};

type SqlClient = ReturnType<typeof postgres>;

function normalizeType(type: string) {
  const normalized = type.toLowerCase().replaceAll(" ", "");
  return normalized === "timestamp" ? "timestampwithouttimezone" : normalized;
}

function normalizeDefault(value: unknown) {
  return value === null || value === undefined
    ? null
    : String(value)
        .toLowerCase()
        .replaceAll(/::(?:text|charactervarying)/g, "")
        .replaceAll(/\s+/g, "");
}

function sameColumns(actual: string[], expected: string[]) {
  return actual.length === expected.length &&
    actual.every((column, index) => column === expected[index]);
}

function normalizeIndexExpression(expression: string) {
  return expression.trim().replace(/^"(.*)"$/, "$1");
}

function expectedIndexExpression(column: {
  expression: string;
  asc?: boolean;
  nulls?: "first" | "last";
}) {
  const descending = column.asc === false;
  let expression = column.expression;
  if (descending) expression += " DESC";
  if (column.nulls === (descending ? "last" : "first")) {
    expression += ` NULLS ${column.nulls.toUpperCase()}`;
  }
  return normalizeIndexExpression(expression);
}

function normalizeIndexPredicate(predicate: string | null | undefined) {
  return predicate?.trim().replaceAll(/\s+/g, " ") ?? null;
}

export function getMigrationBaselineState(tablePresence: boolean[]) {
  if (tablePresence.length === 0 || tablePresence.every(Boolean)) {
    return "verify-snapshot" as const;
  }
  if (tablePresence.every((present) => !present)) {
    return "pending" as const;
  }
  return "partial" as const;
}

export function migrationRequiresDataEffectVerification(migrationSql: string) {
  const executableSql = migrationSql
    .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
    .replaceAll(/--[^\r\n]*/g, " ");
  return /(?:^|;)\s*(?:insert\s+into|update\b|delete\s+from|merge\s+into|truncate(?:\s+table)?\b)/im.test(
    executableSql,
  );
}

const SCHEMA_GUARANTEED_DATA_MIGRATIONS = new Set([
  // 0004 backfills owner_key immediately before SET NOT NULL. Snapshot
  // verification of that constraint proves the backfill completed.
  "0004_add_chat_owner_key",
]);

export function migrationNeedsOperatorVerification(
  tag: string,
  migrationSql: string,
) {
  return (
    migrationRequiresDataEffectVerification(migrationSql) &&
    !SCHEMA_GUARANTEED_DATA_MIGRATIONS.has(tag)
  );
}

export async function findSnapshotMismatches(
  sql: SqlClient,
  snapshot: MigrationSnapshot,
) {
  const mismatches: string[] = [];

  for (const expectedTable of Object.values(snapshot.tables)) {
    const [tableState] = await sql<Array<{ table_name: string | null }>>`
      select to_regclass(${`public.${expectedTable.name}`})::text as table_name
    `;
    if (!tableState?.table_name) {
      mismatches.push(`${expectedTable.name}:missing-table`);
      continue;
    }

    const actualColumns = await sql<
      Array<{
        name: string;
        type: string;
        not_null: boolean;
        default_value: string | null;
      }>
    >`
      select
        attribute.attname as name,
        pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) as type,
        attribute.attnotnull as not_null,
        pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid) as default_value
      from pg_catalog.pg_attribute attribute
      join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      left join pg_catalog.pg_attrdef default_value
        on default_value.adrelid = relation.oid
        and default_value.adnum = attribute.attnum
      where namespace.nspname = 'public'
        and relation.relname = ${expectedTable.name}
        and attribute.attnum > 0
        and not attribute.attisdropped
    `;
    const columnsByName = new Map(actualColumns.map((column) => [column.name, column]));

    for (const expectedColumn of Object.values(expectedTable.columns)) {
      const actualColumn = columnsByName.get(expectedColumn.name);
      if (!actualColumn) {
        mismatches.push(`${expectedTable.name}.${expectedColumn.name}:missing-column`);
        continue;
      }
      if (normalizeType(actualColumn.type) !== normalizeType(expectedColumn.type)) {
        mismatches.push(`${expectedTable.name}.${expectedColumn.name}:wrong-type`);
      }
      if (actualColumn.not_null !== expectedColumn.notNull) {
        mismatches.push(`${expectedTable.name}.${expectedColumn.name}:wrong-nullability`);
      }
      if (
        normalizeDefault(actualColumn.default_value) !==
        normalizeDefault(expectedColumn.default)
      ) {
        mismatches.push(`${expectedTable.name}.${expectedColumn.name}:wrong-default`);
      }
    }

    const constraints = await sql<
      Array<{
        name: string;
        type: string;
        columns: string[];
        foreign_table: string | null;
        foreign_columns: string[];
        on_delete: string;
        on_update: string;
      }>
    >`
      select
        constraint_state.conname as name,
        constraint_state.contype as type,
        array(
          select attribute.attname
          from unnest(constraint_state.conkey) with ordinality as key_column(attnum, position)
          join pg_catalog.pg_attribute attribute
            on attribute.attrelid = constraint_state.conrelid
            and attribute.attnum = key_column.attnum
          order by key_column.position
        ) as columns,
        foreign_relation.relname as foreign_table,
        array(
          select attribute.attname
          from unnest(constraint_state.confkey) with ordinality as key_column(attnum, position)
          join pg_catalog.pg_attribute attribute
            on attribute.attrelid = constraint_state.confrelid
            and attribute.attnum = key_column.attnum
          order by key_column.position
        ) as foreign_columns,
        case constraint_state.confdeltype
          when 'a' then 'no action'
          when 'r' then 'restrict'
          when 'c' then 'cascade'
          when 'n' then 'set null'
          when 'd' then 'set default'
          else ''
        end as on_delete,
        case constraint_state.confupdtype
          when 'a' then 'no action'
          when 'r' then 'restrict'
          when 'c' then 'cascade'
          when 'n' then 'set null'
          when 'd' then 'set default'
          else ''
        end as on_update
      from pg_catalog.pg_constraint constraint_state
      join pg_catalog.pg_class relation on relation.oid = constraint_state.conrelid
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      left join pg_catalog.pg_class foreign_relation
        on foreign_relation.oid = constraint_state.confrelid
      where namespace.nspname = 'public'
        and relation.relname = ${expectedTable.name}
    `;
    const constraintTypes = new Map(
      constraints.map((constraint) => [constraint.name, constraint.type]),
    );
    const primaryKeyColumns = Object.values(expectedTable.columns)
      .filter((column) => column.primaryKey)
      .map((column) => column.name);
    if (
      primaryKeyColumns.length > 0 &&
      !constraints.some(
        (constraint) =>
          constraint.type === "p" &&
          sameColumns(constraint.columns, primaryKeyColumns),
      )
    ) {
      mismatches.push(`${expectedTable.name}:missing-primary-key`);
    }
    for (const [name, expectedConstraint] of Object.entries(
      expectedTable.compositePrimaryKeys,
    )) {
      if (
        !constraints.some(
          (constraint) =>
            constraint.type === "p" &&
            sameColumns(constraint.columns, expectedConstraint.columns),
        )
      ) {
        mismatches.push(`${expectedTable.name}.${name}:missing-composite-primary-key`);
      }
    }
    for (const [name, expectedConstraint] of Object.entries(
      expectedTable.foreignKeys,
    )) {
      if (
        !constraints.some(
          (constraint) =>
            constraint.type === "f" &&
            constraint.foreign_table === expectedConstraint.tableTo &&
            sameColumns(constraint.columns, expectedConstraint.columnsFrom) &&
            sameColumns(
              constraint.foreign_columns,
              expectedConstraint.columnsTo,
            ) &&
            constraint.on_delete === expectedConstraint.onDelete &&
            constraint.on_update === expectedConstraint.onUpdate,
        )
      ) {
        mismatches.push(`${expectedTable.name}.${name}:missing-foreign-key`);
      }
    }
    for (const [name, expectedConstraint] of Object.entries(
      expectedTable.uniqueConstraints,
    )) {
      if (
        !constraints.some(
          (constraint) =>
            constraint.type === "u" &&
            sameColumns(constraint.columns, expectedConstraint.columns),
        )
      ) {
        mismatches.push(`${expectedTable.name}.${name}:missing-unique-constraint`);
      }
    }
    for (const name of Object.keys(expectedTable.checkConstraints)) {
      if (constraintTypes.get(name) !== "c") {
        mismatches.push(`${expectedTable.name}.${name}:missing-check-constraint`);
      }
    }

    const indexes = await sql<
      Array<{
        name: string;
        is_unique: boolean;
        columns: string[];
        method: string;
        predicate: string | null;
      }>
    >`
      select
        index_relation.relname as name,
        index_state.indisunique as is_unique,
        access_method.amname as method,
        pg_get_expr(index_state.indpred, index_state.indrelid, true) as predicate,
        array(
          select pg_get_indexdef(index_state.indexrelid, key_position, true)
          from generate_series(1, index_state.indnkeyatts) as key_position
          order by key_position
        ) as columns
      from pg_catalog.pg_index index_state
      join pg_catalog.pg_class relation on relation.oid = index_state.indrelid
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      join pg_catalog.pg_class index_relation on index_relation.oid = index_state.indexrelid
      join pg_catalog.pg_am access_method on access_method.oid = index_relation.relam
      where namespace.nspname = 'public'
        and relation.relname = ${expectedTable.name}
    `;
    const indexesByName = new Map(indexes.map((index) => [index.name, index]));
    for (const [name, expectedIndex] of Object.entries(expectedTable.indexes)) {
      const actualIndex = indexesByName.get(name);
      if (!actualIndex) {
        mismatches.push(`${expectedTable.name}.${name}:missing-index`);
      } else if (actualIndex.is_unique !== expectedIndex.isUnique) {
        mismatches.push(`${expectedTable.name}.${name}:wrong-index-uniqueness`);
      } else if (actualIndex.method !== (expectedIndex.method ?? "btree")) {
        mismatches.push(`${expectedTable.name}.${name}:wrong-index-method`);
      } else if (
        !sameColumns(
          actualIndex.columns.map(normalizeIndexExpression),
          expectedIndex.columns.map(expectedIndexExpression),
        )
      ) {
        mismatches.push(`${expectedTable.name}.${name}:wrong-index-columns`);
      } else if (
        normalizeIndexPredicate(actualIndex.predicate) !==
        normalizeIndexPredicate(expectedIndex.where)
      ) {
        mismatches.push(`${expectedTable.name}.${name}:wrong-index-predicate`);
      }
    }
  }

  return mismatches;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const [state] = await sql<
      Array<{ migration_table: string | null; projects_table: string | null }>
    >`
      select
        to_regclass('drizzle.__drizzle_migrations')::text as migration_table,
        to_regclass('public.projects')::text as projects_table
    `;

    if (state?.migration_table) {
      const [journalState] = await sql<Array<{ count: number }>>`
        select count(*)::int as count from drizzle.__drizzle_migrations
      `;
      if ((journalState?.count ?? 0) > 0) return;
    }

    if (!state?.projects_table) return;

    if (process.env.BASELINE_EXISTING_DATABASE !== "true") {
      throw new Error(
        "This database already has InfraWatch tables but no migration journal. Back it up, set BASELINE_EXISTING_DATABASE=true for one deployment, then remove that setting after migrations succeed.",
      );
    }

    const migrationsDirectory = path.resolve(process.cwd(), "drizzle");
    const journal = JSON.parse(
      await fs.readFile(
        path.join(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: JournalEntry[] };
    const completed: Array<{ hash: string; when: number; tag: string }> = [];

    for (const entry of journal.entries) {
      const migration = await fs.readFile(
        path.join(migrationsDirectory, `${entry.tag}.sql`),
        "utf8",
      );
      if (migrationNeedsOperatorVerification(entry.tag, migration)) break;

      const tableNames = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
        (match) => match[1],
      );

      const tablePresence = await Promise.all(
        tableNames.map(async (tableName) => {
          const [result] = await sql<Array<{ table_name: string | null }>>`
            select to_regclass(${`public.${tableName}`})::text as table_name
          `;
          return Boolean(result?.table_name);
        }),
      );
      const baselineState = getMigrationBaselineState(tablePresence);
      if (baselineState === "pending") break;
      if (baselineState === "partial") {
        throw new Error(
          `Cannot baseline ${entry.tag}: its tables are only partially present.`,
        );
      }

      const snapshotPrefix = entry.tag.split("_", 1)[0];
      const snapshot = JSON.parse(
        await fs.readFile(
          path.join(
            migrationsDirectory,
            "meta",
            `${snapshotPrefix}_snapshot.json`,
          ),
          "utf8",
        ),
      ) as MigrationSnapshot;
      const mismatches = await findSnapshotMismatches(sql, snapshot);
      if (mismatches.length > 0) {
        if (tableNames.length === 0) break;
        throw new Error(
          `Cannot baseline ${entry.tag}: schema verification failed (${mismatches
            .slice(0, 5)
            .join(", ")}${mismatches.length > 5 ? ", ..." : ""}).`,
        );
      }

      completed.push({
        tag: entry.tag,
        when: entry.when,
        hash: createHash("sha256").update(migration).digest("hex"),
      });
    }

    if (completed.length === 0) {
      throw new Error(
        "The existing schema does not match a complete InfraWatch migration. Refusing to baseline it automatically.",
      );
    }

    await sql.begin(async (transaction) => {
      await transaction.unsafe("create schema if not exists drizzle");
      await transaction.unsafe(`
        create table if not exists drizzle.__drizzle_migrations (
          id serial primary key,
          hash text not null,
          created_at bigint
        )
      `);
      const [existing] = await transaction<Array<{ count: number }>>`
        select count(*)::int as count from drizzle.__drizzle_migrations
      `;
      if ((existing?.count ?? 0) !== 0) {
        throw new Error("Migration journal changed while preparing the baseline.");
      }

      for (const migration of completed) {
        await transaction`
          insert into drizzle.__drizzle_migrations (hash, created_at)
          values (${migration.hash}, ${migration.when})
        `;
      }
    });

    console.log(`Baselined existing database through ${completed.at(-1)?.tag}.`);
  } finally {
    await sql.end();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration preparation failed.");
    process.exitCode = 1;
  });
}

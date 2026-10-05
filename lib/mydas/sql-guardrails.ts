import { MYDAS_ALLOWED_TABLES } from "./schema-description";

const FORBIDDEN_KEYWORDS = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate",
  "grant", "revoke", "execute", "call", "copy", "vacuum", "comment",
  "merge", "replace", "attach", "detach", "pragma", "listen", "notify",
  "pg_sleep", "pg_read_file", "pg_write_file", "dblink", "lo_import", "lo_export",
  "into", "with",
];

export type SqlValidationResult =
  | { ok: true; sql: string }
  | { ok: false; reason: string };

// Defense-in-depth validation for AI-generated SQL: the model is instructed to
// only write read-only, single-table-allowlisted SELECTs, but instructions
// alone are not a security boundary — this is. Every one of these checks must
// pass before the string is ever handed to the database.
export function validateMydasSql(rawSql: string): SqlValidationResult {
  let sql = rawSql.trim();

  if (!sql) return { ok: false, reason: "Empty query." };

  // Strip exactly one trailing semicolon, then reject anything that still has one
  // (a second statement, or a semicolon mid-query).
  sql = sql.replace(/;\s*$/, "");
  if (sql.includes(";")) {
    return { ok: false, reason: "Only a single SQL statement is allowed." };
  }

  if (sql.includes("--") || sql.includes("/*")) {
    return { ok: false, reason: "SQL comments are not allowed." };
  }

  if (!/^\s*\(*\s*select\s/i.test(sql)) {
    return { ok: false, reason: "Only SELECT statements are allowed." };
  }

  const lower = sql.toLowerCase();
  for (const word of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      return { ok: false, reason: `Disallowed keyword: ${word}` };
    }
  }

  const tableMatches = [...lower.matchAll(/\b(?:from|join)\s+"?([a-z_][a-z0-9_]*)"?/gi)];
  if (tableMatches.length === 0) {
    return { ok: false, reason: "No table reference found." };
  }
  for (const match of tableMatches) {
    const table = match[1];
    if (!(MYDAS_ALLOWED_TABLES as readonly string[]).includes(table)) {
      return {
        ok: false,
        reason: `Table "${table}" is not allowed. Allowed tables: ${MYDAS_ALLOWED_TABLES.join(", ")}.`,
      };
    }
  }

  const limitMatch = lower.match(/\blimit\s+(\d+)/);
  if (!limitMatch) {
    sql = `${sql} LIMIT 500`;
  } else if (Number(limitMatch[1]) > 1000) {
    sql = sql.replace(/\blimit\s+\d+/i, "LIMIT 1000");
  }

  return { ok: true, sql };
}

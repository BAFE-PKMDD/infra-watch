import "server-only";

import { generateObject } from "ai";
import { sql as drizzleSql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { getAIModel } from "@/lib/ai-provider";
import type { MydasChartData, MydasDisplayType } from "@/types/mydas.types";
import { MYDAS_DISPLAY_TYPES } from "@/types/mydas.types";
import { MYDAS_ANALYTICS_CATALOG } from "./analytics-catalog";
import { checkChartShape, MAX_VALUE_FIELDS, projectTrend, rowsToChartData } from "./chart-data";
import { MYDAS_SCHEMA_DESCRIPTION } from "./schema-description";
import { validateMydasSql } from "./sql-guardrails";

// A flat object where every field is REQUIRED (branched manually below), rather
// than a z.discriminatedUnion or optional fields on a flat object — Gemini's
// structured output is unreliable with both: a discriminated union makes
// generateObject throw "response did not match schema" outright, and marking
// fields optional makes the model inconsistently omit them even on the branch
// where they're needed. Requiring every field and telling the model to fill
// the irrelevant ones with a fixed placeholder is the reliable workaround.
const mydasReplySchema = z.object({
  kind: z.enum(["chart", "text", "catalog"]),
  sql: z.string().min(1).describe("When kind is \"chart\": a single read-only PostgreSQL SELECT statement answering the question. Otherwise: the literal string \"n/a\"."),
  chartType: z.enum(MYDAS_DISPLAY_TYPES).describe("When kind is \"chart\": the chart type from the list in the instructions. Otherwise: \"bar\"."),
  title: z.string().min(1).max(100).describe("When kind is \"chart\": short, human-readable chart title. Otherwise: the literal string \"n/a\"."),
  labelField: z.string().min(1).describe("When kind is \"chart\": the exact column alias in the query result to use as each row's label. Otherwise: the literal string \"n/a\"."),
  valueFields: z.array(z.string().min(1)).min(1).max(MAX_VALUE_FIELDS).describe("When kind is \"chart\": the exact column aliases in the query result to use as numeric values, in the order the chart type requires. Otherwise: [\"n/a\"]."),
  message: z.string().min(1).max(600).describe("When kind is \"text\": a short, plain-language reply, no chart is being generated. When kind is \"chart\": a one-sentence summary of what the chart shows. When kind is \"catalog\": the literal string \"n/a\"."),
});

const chartTypeGuidance = MYDAS_ANALYTICS_CATALOG.map(
  (entry) => `- "${entry.type}" (${entry.label}): ${entry.description} Query shape: ${entry.queryGuidance}`,
).join("\n");

const SYSTEM_PROMPT = `You are MYDAS, a data analyst for InfraWatch, an agricultural infrastructure monitoring system.

First decide what kind of message this is:
- If it is a request for specific data, a ranking, a comparison, or a breakdown that a chart could show, respond with kind "chart": write ONE read-only PostgreSQL query to answer it, then pick the chart type from the list below that shows the result most clearly.
- If it asks what analytics, charts, or reports you can generate (e.g. "give me all analytics", "what can you analyze?", "what charts are available?"), respond with kind "catalog". Do not write a text list yourself; the list is generated from the catalog.
- If it is anything else — a greeting, a request to remove/undo something, small talk, or a question too vague to turn into one query — respond with kind "text": a short, direct, plain-language reply. Never invent a chart just to have something to show.

Scope and disclosure:
- Only answer questions about InfraWatch's own data (projects, feedback, reported issues, contact messages) and what MYDAS can analyze. For general knowledge or programming questions, or anything unrelated to this data, reply briefly that you can only help with InfraWatch project data, and offer an example question instead. Do not answer the unrelated question itself.
- Never describe the technology stack, database engine, SQL, raw table or column names, or how you work internally. Plain-language descriptions of the data (e.g. "project records", "citizen feedback") are fine. If asked, say you can only help with analyzing InfraWatch data.

Tables you may query (nothing else exists for you):
${MYDAS_SCHEMA_DESCRIPTION}

Chart types (chartType must be one of these):
${chartTypeGuidance}

Rules for kind "chart":
- Only SELECT statements. Never write INSERT/UPDATE/DELETE/DROP/ALTER/CREATE or any statement that modifies data.
- Only reference the tables listed above, by their bare name (no "public." prefix).
- No CTEs (WITH ...), no UNIONs, no multiple statements — a single SELECT ... FROM ... [JOIN ...] [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT ...].
- Alias every computed column with a clear snake_case name, and use those exact aliases as labelField and valueFields.
- Every value field must resolve to a number (COUNT, SUM, AVG, PERCENTILE_CONT, or a numeric column).
- If the question implies ranking ("top 10", "most", "highest"), add ORDER BY ... DESC and a LIMIT (default 10 if the question doesn't say a number).
- Return at most 12 rows (set LIMIT accordingly) — the chart cannot show more.
- Use "pie" or "donut" only for a part-of-whole breakdown with at most 6 categories.
- title is a short chart title for a dashboard, not a restatement of the question.

Output shape: every field below is required, so you must always fill in all of them.
- When kind is "chart": set sql/chartType/title/labelField/valueFields for real, and set message to a one-sentence summary of what the chart shows.
- When kind is "text": set message to your actual reply, and set sql/title/labelField to "n/a", valueFields to ["n/a"], and chartType to "bar".
- When kind is "catalog": set message to "n/a", sql/title/labelField to "n/a", valueFields to ["n/a"], and chartType to "bar".`;

function humanizeField(field: string) {
  const words = field.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type MydasReply =
  | { kind: "chart"; displayType: MydasDisplayType; chart: MydasChartData; sql: string }
  | { kind: "text"; message: string }
  | { kind: "catalog" };

export async function generateMydasWidget(question: string): Promise<MydasReply> {
  const { object } = await generateObject({
    model: getAIModel(),
    schema: mydasReplySchema,
    system: SYSTEM_PROMPT,
    prompt: question,
  });

  if (object.kind === "text") {
    return { kind: "text", message: object.message };
  }

  if (object.kind === "catalog") {
    return { kind: "catalog" };
  }

  const { sql: generatedSql, chartType, title, labelField, valueFields } = object;

  const shapeError = checkChartShape(chartType, valueFields.length);
  if (shapeError) {
    throw new Error(shapeError);
  }

  const validated = validateMydasSql(generatedSql);
  if (!validated.ok) {
    throw new Error(`The generated query failed a safety check (${validated.reason}). Try rephrasing your question.`);
  }

  const rows = await db.transaction(async (tx) => {
    await tx.execute(drizzleSql.raw(`SET LOCAL statement_timeout = '5000'`));
    return (await tx.execute(drizzleSql.raw(validated.sql))) as unknown as Record<string, unknown>[];
  });

  if (!rows || rows.length === 0) {
    throw new Error("That query didn't return any data — try rephrasing or broadening your question.");
  }

  const columnNames = Object.keys(rows[0]);
  const missingField = [labelField, ...valueFields].find((field) => !columnNames.includes(field));
  if (missingField) {
    throw new Error(`The query didn't return a column named "${missingField}". Try rephrasing your question.`);
  }

  const seriesNames = valueFields.map(humanizeField);
  const built = rowsToChartData(title, seriesNames, rows, labelField, valueFields);
  let chart = built;
  if (chartType === "trend") {
    const projection = projectTrend(built);
    if (!projection.ok) {
      throw new Error(projection.reason);
    }
    chart = projection.chart;
  }
  const allEmpty = chart.data.every((row) => row.label === "Unknown" && row.values.every((value) => value === 0));
  if (allEmpty) {
    throw new Error("Couldn't match the query results to a chart — try rephrasing your question.");
  }

  return { kind: "chart", displayType: chartType, chart, sql: validated.sql };
}

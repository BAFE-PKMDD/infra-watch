import "server-only";

import { generateObject } from "ai";
import { sql as drizzleSql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { getAIModel } from "@/lib/ai-provider";
import { parseChartSpec, type ChartSpec } from "@/lib/chat-visuals";
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
  kind: z.enum(["chart", "text"]),
  sql: z.string().min(1).describe("When kind is \"chart\": a single read-only PostgreSQL SELECT statement answering the question. When kind is \"text\": the literal string \"n/a\"."),
  chartType: z.enum(["bar", "pie"]).describe("When kind is \"text\": default to \"bar\"."),
  title: z.string().min(1).max(100).describe("When kind is \"chart\": short, human-readable chart title. When kind is \"text\": the literal string \"n/a\"."),
  xField: z.string().min(1).describe("When kind is \"chart\": the exact column alias in the query result to use as each data point's label. When kind is \"text\": the literal string \"n/a\"."),
  yField: z.string().min(1).describe("When kind is \"chart\": the exact column alias in the query result to use as each data point's numeric value. When kind is \"text\": the literal string \"n/a\"."),
  message: z.string().min(1).max(600).describe("When kind is \"text\": a short, plain-language reply, no chart is being generated. When kind is \"chart\": a one-sentence summary of what the chart shows."),
});

const SYSTEM_PROMPT = `You are MYDAS, a data analyst for InfraWatch, an agricultural infrastructure monitoring system.

First decide what kind of message this is:
- If it is a request for specific data, a ranking, a comparison, or a breakdown that a chart could show, respond with kind "chart": write ONE read-only PostgreSQL query to answer it, then pick the clearest chart to show the result.
- If it is anything else — a greeting, a meta-question like "what can you analyze?" or "what analytics are available?", a request to remove/undo something, small talk, or a question too vague to turn into one query — respond with kind "text": a short, direct, plain-language reply. For "what can you analyze?"-style questions, briefly describe the tables below in plain terms and give 2-3 example questions. Never invent a chart just to have something to show.

Tables you may query (nothing else exists for you):
${MYDAS_SCHEMA_DESCRIPTION}

Rules for kind "chart":
- Only SELECT statements. Never write INSERT/UPDATE/DELETE/DROP/ALTER/CREATE or any statement that modifies data.
- Only reference the tables listed above, by their bare name (no "public." prefix).
- No CTEs (WITH ...), no UNIONs, no multiple statements — a single SELECT ... FROM ... [JOIN ...] [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT ...].
- Alias every aggregated or computed column with a clear snake_case name, and use those exact aliases as xField/yField.
- yField must resolve to a number (COUNT, SUM, AVG, or a numeric column).
- If the question implies ranking ("top 10", "most", "highest"), add ORDER BY ... DESC and a LIMIT (default 10 if the question doesn't say a number).
- Return at most 12 rows (set LIMIT accordingly) — the chart cannot show more.
- Use chartType "pie" only for a simple part-of-whole breakdown with at most 6 categories; use "bar" for everything else, especially rankings.
- title is a short chart title for a dashboard, not a restatement of the question.

Output shape: every field below is required, so you must always fill in all of them.
- When kind is "chart": set sql/chartType/title/xField/yField for real, and set message to a one-sentence summary of what the chart shows.
- When kind is "text": set message to your actual reply, and set sql/title/xField/yField to the literal string "n/a" and chartType to "bar" — these are placeholders that will be ignored.`;

export type MydasReply =
  | { kind: "chart"; chart: ChartSpec; sql: string }
  | { kind: "text"; message: string };

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

  const { sql: generatedSql, chartType, title, xField, yField } = object;

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

  const data = rows.slice(0, 12).map((row) => {
    const rawValue = row[yField];
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
    return {
      label: String(row[xField] ?? "Unknown").slice(0, 48),
      value: Number.isFinite(value) ? Math.max(0, value) : 0,
    };
  });

  if (data.every((d) => d.label === "Unknown" && d.value === 0)) {
    throw new Error("Couldn't match the query results to a chart — try rephrasing your question.");
  }

  const chart = parseChartSpec(JSON.stringify({ type: chartType, title, data }));
  if (!chart) {
    throw new Error("Couldn't build a valid chart from the query results — try rephrasing your question.");
  }

  return { kind: "chart", chart, sql: validated.sql };
}

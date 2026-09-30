import { eq, or, sql } from "drizzle-orm";

import { projects } from "@/lib/db/schema";

/**
 * SQL equivalent of `getPublicStage` in ./rules.ts (Rule 1): matches only rows that
 * resolve to a public stage there. Any query that lists or links to projects for the
 * public must apply this, or it can surface a project (e.g. a still-a-proposal record)
 * that the public project detail page then reports as not found. Keep in sync with
 * getPublicStage.
 */
export function publicStageCondition() {
  const status = sql`lower(trim(${projects.status}))`;
  const stage = sql`lower(trim(${projects.stage}))`;
  return or(
    eq(status, "suspended"),
    eq(status, "completed"),
    eq(status, "for turn-over"),
    eq(status, "ongoing"),
    eq(status, "under-construction"),
    eq(stage, "implementation"),
    eq(stage, "procurement"),
  )!;
}

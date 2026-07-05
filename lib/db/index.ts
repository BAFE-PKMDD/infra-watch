import "server-only";

import * as authSchema from "@/auth-schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const isProductionRuntime = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
const databaseUrl = process.env.DATABASE_URL;

if (isProductionRuntime && !databaseUrl) {
  throw new Error("DATABASE_URL must be set in production.");
}

const sql = postgres(
  databaseUrl ?? "postgres://postgres:postgres@localhost:5432/infra_watch",
  {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT ?? 20),
    max_lifetime: Number(process.env.DATABASE_MAX_LIFETIME ?? 1800),
  },
);

export const db = drizzle(sql, { schema: { ...schema, ...authSchema } });

export type Database = typeof db;
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Create it in your .env.local or .env file before running Drizzle commands.");
}

const schemaPaths = ["./lib/db/schema.ts"];
const tablesFilter: string[] = [];

if (process.env.DRIZZLE_INCLUDE_AUTH === "true") {
  schemaPaths.push("./auth-schema.ts");
  tablesFilter.push("user", "session", "account", "verification");
}

export default defineConfig({
  schema: schemaPaths,
  out: "./drizzle",
  dialect: "postgresql",
  tablesFilter,
  dbCredentials: {
    url: databaseUrl,
  },
});
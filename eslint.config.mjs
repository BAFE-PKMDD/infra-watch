import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off CommonJS database and repository maintenance utilities.
    "add_env.js",
    "append.js",
    "append_schema.js",
    "create_psgc.js",
    "drop_all.js",
    "drop_checklists.js",
    "drop_feedback.js",
    "enable_postgis.js",
    "patch.js",
    "query.js",
    "reset_db.js",
    "restore.js",
    "truncate.js",
  ]),
]);

export default eslintConfig;

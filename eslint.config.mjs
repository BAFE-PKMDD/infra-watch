import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "legacy-root-commonjs-maintenance-scripts",
    files: [
      "add_env.js",
      "append.js",
      "append_schema.js",
      "check.js",
      "create_tables.js",
      "create_psgc.js",
      "drop_all.js",
      "drop_checklists.js",
      "drop_feedback.js",
      "enable_postgis.js",
      "enable_pgvector.js",
      "patch.js",
      "query.js",
      "reindex-stuck.js",
      "reset_db.js",
      "restore.js",
      "test-embed.js",
      "test-error.js",
      "test-minio.js",
      "test-pdf.js",
      "test-search.js",
      "truncate.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated ANIA speech-synthesis worker bundle (scripts/build-tts-worker.mts).
    "public/ania/**",
    // One-off CommonJS database and repository maintenance utilities.
    "add_env.js",
    "append.js",
    "append_schema.js",
    "check.js",
    "create_tables.js",
    "create_psgc.js",
    "drop_all.js",
    "drop_checklists.js",
    "drop_feedback.js",
    "enable_postgis.js",
    "enable_pgvector.js",
    "patch.js",
    "query.js",
    "reindex-stuck.js",
    "reset_db.js",
    "restore.js",
    "test-embed.js",
    "test-error.js",
    "test-minio.js",
    "test-pdf.js",
    "test-search.js",
    "truncate.js",
  ]),
]);

export default eslintConfig;

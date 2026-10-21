import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { createTtsRuntimePlugin } from "./tts-runtime-plugin";

const OUTFILE = "public/ania/tts-worker.js";
// Local sources the worker bundle is built from; node_modules changes need a forced rebuild.
const SOURCE_PATHS = ["lib/voice", "scripts/tts-runtime-plugin.ts", "scripts/build-tts-worker.mts"];

function newestMtime(path: string): number {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats) return 0;
  if (!stats.isDirectory()) return stats.mtimeMs;
  return readdirSync(path).reduce((newest, entry) => Math.max(newest, newestMtime(join(path, entry))), 0);
}

// `--if-stale` is used by `dev` to skip the rebuild when the worker is already up to date.
if (process.argv.includes("--if-stale")) {
  const built = statSync(OUTFILE, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  if (built > Math.max(...SOURCE_PATHS.map(newestMtime))) {
    console.log(`${OUTFILE} is up to date, skipping build`);
    process.exit(0);
  }
}

await build({
  entryPoints: ["lib/voice/tts-worker.ts"],
  outfile: OUTFILE,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: false,
  plugins: [createTtsRuntimePlugin()],
  logLevel: "info",
});

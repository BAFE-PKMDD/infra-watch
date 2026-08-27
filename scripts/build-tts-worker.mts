import { build } from "esbuild";

await build({
  entryPoints: ["lib/voice/tts-worker.ts"],
  outfile: "public/ania/tts-worker.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: false,
  logLevel: "info",
});

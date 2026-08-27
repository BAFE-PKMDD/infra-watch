import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface PackageManifest {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

test("the TTS worker build uses Bun directly with an explicit esbuild dependency", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as PackageManifest;

  assert.equal(
    manifest.scripts?.["build:tts-worker"],
    "bun scripts/build-tts-worker.mts",
  );
  assert.equal(manifest.devDependencies?.esbuild, "0.28.1");
});

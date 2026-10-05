import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { test } from "bun:test";
import { build } from "esbuild";
import { createTtsRuntimePlugin } from "../../scripts/tts-runtime-plugin";

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

test("Kokoro input tensors use the web runtime's CPU location and constructor", async () => {
  const kokoroRequire = createRequire(import.meta.resolve("kokoro-js"));
  const result = await build({
    stdin: {
      contents: `
        import { Tensor as InputTensor } from "onnxruntime-common";
        import { Tensor as RuntimeTensor } from "onnxruntime-web";
        const tensor = new InputTensor("int64", BigInt64Array.from([1n, 2n]), [1, 2]);
        export const location = tensor.location;
        export const sameConstructor = tensor instanceof RuntimeTensor;
      `,
      resolveDir: dirname(kokoroRequire.resolve("@huggingface/transformers")),
    },
    bundle: true,
    format: "cjs",
    platform: "browser",
    target: "es2022",
    write: false,
    plugins: [createTtsRuntimePlugin()],
    logLevel: "silent",
  });
  const probeModule: {
    exports: { location?: string; sameConstructor?: boolean };
  } = { exports: {} };
  runInNewContext(result.outputFiles[0].text, {
    exports: probeModule.exports,
    module: probeModule,
    console,
  });
  const probe = probeModule.exports;

  assert.equal(probe.location, "cpu");
  assert.equal(probe.sameConstructor, true);
});

test("the speech worker does not bundle a separate ONNX Common implementation", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./tts-worker.ts", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
    metafile: true,
    plugins: [createTtsRuntimePlugin()],
    logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs);

  assert.ok(inputs.some((path) => path.includes("onnxruntime-web/dist/")));
  assert.ok(!inputs.some((path) => path.includes("onnxruntime-common/")));
});

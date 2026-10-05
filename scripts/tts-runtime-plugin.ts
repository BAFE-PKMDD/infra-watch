import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { Plugin } from "esbuild";

export function createTtsRuntimePlugin(): Plugin {
  const kokoroRequire = createRequire(import.meta.resolve("kokoro-js"));
  const transformersDirectory = dirname(
    kokoroRequire.resolve("@huggingface/transformers"),
  );

  return {
    name: "kokoro-onnx-tensors",
    setup(builder) {
      // Transformers imports Common separately. Use the web runtime's own
      // exports so its input tensors share both the version and constructor.
      builder.onResolve({ filter: /^onnxruntime-common$/ }, () =>
        builder.resolve("onnxruntime-web", {
          resolveDir: transformersDirectory,
          kind: "import-statement",
        }),
      );
    },
  };
}

import assert from "node:assert/strict";
import { test } from "bun:test";

import { initializeImageModerationRuntime } from "./image-moderation-runtime";

test("initializes and readies the native TensorFlow runtime before loading the NSFW model", async () => {
  const events: string[] = [];
  const runtime = {
    ready: async () => {
      events.push("runtime-ready");
    },
  };
  const model = { name: "model" };

  const result = await initializeImageModerationRuntime({
    loadRuntime: async () => {
      events.push("runtime-loaded");
      return runtime;
    },
    loadModel: async () => {
      events.push("model-loaded");
      return model;
    },
  });

  assert.deepEqual(events, ["runtime-loaded", "runtime-ready", "model-loaded"]);
  assert.equal(result.runtime, runtime);
  assert.equal(result.model, model);
});

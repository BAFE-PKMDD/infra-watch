import assert from "node:assert/strict";
import test from "node:test";

import { getAIConfig, getAIModel } from "./ai-provider";

test("Gemini defaults to the current flash alias when model settings are blank", () => {
  const original = {
    provider: process.env.AI_PROVIDER,
    model: process.env.AI_MODEL,
    geminiModel: process.env.GEMINI_MODEL,
  };

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_MODEL = "";
    process.env.GEMINI_MODEL = "";

    const model = getAIModel();
    assert.deepEqual(getAIConfig(), {
      provider: "gemini",
      modelId: "gemini-flash-latest",
    });
    assert.notEqual(typeof model, "string");
    if (typeof model === "string") {
      throw new Error("Expected a configured Gemini model instance");
    }
    assert.equal(model.modelId, "gemini-flash-latest");
  } finally {
    if (original.provider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = original.provider;

    if (original.model === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = original.model;

    if (original.geminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = original.geminiModel;
  }
});

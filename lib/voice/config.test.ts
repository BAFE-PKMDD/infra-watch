import assert from "node:assert/strict";
import test from "node:test";
import { getVoiceAssistantConfig, isVoiceAssistantEnabled } from "./config";

test("voice assistant is disabled unless explicitly enabled", () => {
  assert.equal(isVoiceAssistantEnabled({}), false);
  assert.equal(isVoiceAssistantEnabled({ VOICE_ASSISTANT_ENABLED: "false" }), false);
});

test("voice assistant exposes only safe client configuration", () => {
  const config = getVoiceAssistantConfig({
    VOICE_ASSISTANT_ENABLED: "true",
    WAKE_WORD: "hey_ania",
    WAKE_WORD_WS_URL: "wss://infra-watch.example/voice/wake",
    KOKORO_MODEL_PATH: "onnx-community/Kokoro-82M-v1.0-ONNX",
    KOKORO_API_KEY: "must-not-leak",
  });

  assert.deepEqual(config, {
    enabled: true,
    wakeWord: "hey_ania",
    wakeWordWsUrl: "wss://infra-watch.example/voice/wake",
    kokoroModel: "onnx-community/Kokoro-82M-v1.0-ONNX",
    kokoroVoice: "af_heart",
  });
  assert.doesNotMatch(JSON.stringify(config), /must-not-leak/);
});

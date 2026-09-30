import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";
import vm from "node:vm";

const hookSource = readFileSync(
  new URL("../../hooks/use-voice-assistant.ts", import.meta.url),
  "utf8",
);
const workletSource = readFileSync(
  new URL("../../public/voice-input-processor.js", import.meta.url),
  "utf8",
);

test("voice capture uses an AudioWorklet instead of deprecated ScriptProcessorNode", () => {
  assert.doesNotMatch(hookSource, /ScriptProcessorNode|createScriptProcessor/);
  assert.match(hookSource, /audioWorklet\.addModule\("\/voice-input-processor\.js"\)/);
  assert.match(hookSource, /new AudioWorkletNode\(activeContext, "voice-input-processor"/);
});

test("voice input worklet batches and forwards copied mono audio to the main thread", () => {
  let Processor: (new () => {
    port: { postMessage: (value: unknown, transfer?: ArrayBuffer[]) => void };
    process: (inputs: Float32Array[][]) => boolean;
  }) | undefined;

  class FakeAudioWorkletProcessor {
    port = { postMessage() {} };
  }

  vm.runInNewContext(workletSource, {
    Float32Array,
    AudioWorkletProcessor: FakeAudioWorkletProcessor,
    registerProcessor: (name: string, constructor: typeof Processor) => {
      assert.equal(name, "voice-input-processor");
      Processor = constructor;
    },
  });

  assert.ok(Processor);
  const processor = new Processor();
  const messages: Array<{ value: unknown; transfer?: ArrayBuffer[] }> = [];
  processor.port.postMessage = (value, transfer) => messages.push({ value, transfer });
  const frame = Float32Array.from({ length: 128 }, (_, index) => index / 128);

  for (let index = 0; index < 31; index += 1) {
    assert.equal(processor.process([[frame]]), true);
  }
  assert.equal(messages.length, 0);
  assert.equal(processor.process([[frame]]), true);

  assert.equal(messages.length, 1);
  assert.ok(messages[0]?.value instanceof Float32Array);
  const batch = messages[0]?.value as Float32Array;
  assert.equal(batch.length, 4096);
  assert.deepEqual(Array.from(batch.slice(0, 128)), Array.from(frame));
  assert.notEqual(batch.buffer, frame.buffer);
  assert.deepEqual(messages[0]?.transfer, [batch.buffer]);
});

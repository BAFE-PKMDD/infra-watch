import assert from "node:assert/strict";
import test from "node:test";

import { streamText } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";

import {
  GENERIC_CHAT_ERROR,
  createChatResponseStream,
  createChatStreamTerminalState,
} from "./chat-stream";

async function readTextStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

test("appends a visible terminal notice after a partial provider stream error", async () => {
  const terminalState = createChatStreamTerminalState();
  const model = new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "answer" },
          { type: "text-delta", id: "answer", delta: "Partial answer" },
          { type: "error", error: new Error("provider failed") },
        ],
        initialDelayInMs: null,
        chunkDelayInMs: null,
      }),
    },
  });
  const result = streamText({
    model,
    prompt: "test",
    onError: () => terminalState.markProviderError(),
  });

  const responseStream = createChatResponseStream({
    textStream: result.textStream,
    terminalState,
  });

  assert.equal(
    await readTextStream(responseStream),
    `Partial answer\n\n${GENERIC_CHAT_ERROR}`,
  );
});

test("does not synthesize a provider error after request cancellation", async () => {
  const terminalState = createChatStreamTerminalState();
  terminalState.markRequestAborted();

  const responseStream = createChatResponseStream({
    textStream: (async function* () {})(),
    terminalState,
  });

  assert.equal(await readTextStream(responseStream), "");
});

test("does not synthesize a provider error when a cancelled stream throws", async () => {
  const terminalState = createChatStreamTerminalState();
  terminalState.markRequestAborted();

  const responseStream = createChatResponseStream({
    textStream: (async function* () {
      throw new DOMException("cancelled", "AbortError");
    })(),
    terminalState,
  });

  assert.equal(await readTextStream(responseStream), "");
});

test("reports the exact text emitted to the client", async () => {
  const terminalState = createChatStreamTerminalState();
  let completedText: string | null = null;
  const responseStream = createChatResponseStream({
    textStream: (async function* () {
      yield "Tool-step preamble. ";
      yield "Final answer.";
    })(),
    terminalState,
    onComplete: (text) => {
      completedText = text;
    },
  });

  const visibleText = await readTextStream(responseStream);

  assert.equal(visibleText, "Tool-step preamble. Final answer.");
  assert.equal(completedText, visibleText);
});

test("does not keep the response open while completion persistence is pending", async () => {
  const terminalState = createChatStreamTerminalState();
  let releaseCompletion!: () => void;
  const completionGate = new Promise<void>((resolve) => {
    releaseCompletion = resolve;
  });
  const responseStream = createChatResponseStream({
    textStream: (async function* () {
      yield "Complete answer.";
    })(),
    terminalState,
    onComplete: () => completionGate,
  });
  const reader = responseStream.getReader();

  assert.equal(
    new TextDecoder().decode((await reader.read()).value),
    "Complete answer.",
  );
  const closeResult = await Promise.race([
    reader.read().then(({ done }) => (done ? "closed" : "open")),
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("blocked"), 25),
    ),
  ]);
  releaseCompletion();

  assert.equal(closeResult, "closed");
});

test("cancels upstream generation when the response reader is cancelled", async () => {
  const terminalState = createChatStreamTerminalState();
  let cancelled = false;
  let iteratorReturned = false;
  let emittedAfterCancellation = false;
  let completed = false;
  let step = 0;
  const textStream: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          step += 1;
          if (step === 1) return { value: "first", done: false };
          await new Promise((resolve) => setTimeout(resolve, 25));
          if (cancelled) return { value: undefined, done: true };
          emittedAfterCancellation = true;
          return { value: "late", done: false };
        },
        async return() {
          iteratorReturned = true;
          return { value: undefined, done: true };
        },
      };
    },
  };

  const responseStream = createChatResponseStream({
    textStream,
    terminalState,
    onCancel: () => {
      cancelled = true;
    },
    onComplete: () => {
      completed = true;
    },
  });
  const reader = responseStream.getReader();

  assert.equal(new TextDecoder().decode((await reader.read()).value), "first");
  await reader.cancel();
  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.equal(cancelled, true);
  assert.equal(iteratorReturned, true);
  assert.equal(emittedAfterCancellation, false);
  assert.equal(completed, false);
});

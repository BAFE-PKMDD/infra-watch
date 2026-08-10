import assert from "node:assert/strict";
import test from "node:test";

import { createChatHistoryLifecycle } from "./chat-history-lifecycle";

test("terminal cancellation wins over an in-flight completion write", async () => {
  const lifecycle = createChatHistoryLifecycle();
  const events: string[] = [];
  let releaseCompletion!: () => void;
  const completionGate = new Promise<void>((resolve) => {
    releaseCompletion = resolve;
  });

  assert.equal(
    lifecycle.beginCompletion(async () => {
      events.push("completion-started");
      await completionGate;
      events.push("completed");
    }),
    true,
  );
  const terminalWrite = lifecycle.settleTerminal(async () => {
    events.push("aborted");
  });

  assert.equal(lifecycle.isInvalidated(), true);
  assert.equal(
    lifecycle.beginCompletion(async () => {
      events.push("late-completion");
    }),
    false,
  );
  releaseCompletion();
  await terminalWrite;

  assert.deepEqual(events, ["completion-started", "completed", "aborted"]);
});

test("terminal settlement is idempotent", async () => {
  const lifecycle = createChatHistoryLifecycle();
  let writes = 0;
  const writeTerminal = async () => {
    writes += 1;
  };

  await Promise.all([
    lifecycle.settleTerminal(writeTerminal),
    lifecycle.settleTerminal(writeTerminal),
  ]);

  assert.equal(writes, 1);
});

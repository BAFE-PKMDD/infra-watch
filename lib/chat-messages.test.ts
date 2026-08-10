import assert from "node:assert/strict";
import test from "node:test";

import {
  appendToLastAssistantMessage,
  ensureAssistantMessage,
  getBoundedChatHistory,
} from "./chat-messages";

test("appends streamed text to the latest assistant message", () => {
  const messages = [
    { role: "user" as const, content: "Question" },
    { role: "assistant" as const, content: "Hel" },
  ];

  assert.deepEqual(appendToLastAssistantMessage(messages, "lo"), [
    messages[0],
    { role: "assistant", content: "Hello" },
  ]);
});

test("ignores late stream chunks after messages are cleared", () => {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  assert.equal(appendToLastAssistantMessage(messages, "late chunk"), messages);
});

test("does not append a stream chunk to a user message", () => {
  const messages = [{ role: "user" as const, content: "New question" }];
  assert.equal(appendToLastAssistantMessage(messages, "late chunk"), messages);
});

test("keeps the newest complete messages within server history limits", () => {
  const messages = Array.from({ length: 25 }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `${index}`.padEnd(1_500, "x"),
  }));

  const result = getBoundedChatHistory(messages);
  const totalCharacters = result.reduce(
    (total, message) => total + message.content.length,
    0,
  );

  assert.ok(result.length <= 20);
  assert.ok(totalCharacters <= 20_000);
  assert.equal(result.at(-1)?.content, messages.at(-1)?.content);
});

test("adds or replaces an empty assistant message for cancellation feedback", () => {
  assert.deepEqual(
    ensureAssistantMessage(
      [{ role: "user", content: "Question" }],
      "Response cancelled.",
    ),
    [
      { role: "user", content: "Question" },
      { role: "assistant", content: "Response cancelled." },
    ],
  );

  assert.deepEqual(
    ensureAssistantMessage(
      [
        { role: "user", content: "Question" },
        { role: "assistant", content: "" },
      ],
      "Response cancelled.",
    ),
    [
      { role: "user", content: "Question" },
      { role: "assistant", content: "Response cancelled." },
    ],
  );

  assert.deepEqual(
    ensureAssistantMessage(
      [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Partial response" },
      ],
      "Response cancelled.",
    ),
    [
      { role: "user", content: "Question" },
      {
        role: "assistant",
        content: "Partial response\n\nResponse cancelled.",
      },
    ],
  );
});

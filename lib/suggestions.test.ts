import assert from "node:assert/strict";
import { test } from "bun:test";
import { contactMessageInputSchema } from "./contact-messages";
import { SUGGESTION_CATEGORIES, suggestionInputSchema, toSuggestionContactMessage } from "./suggestions";

const valid = {
  category: "suggestion",
  name: " Juan Dela Cruz ",
  email: " Juan@Example.com ",
  subject: "Improve the project search",
  message: "Please add a way to search projects by barangay.",
  website: "",
};

test("system suggestions keep their category in the staff inbox and satisfy its validation", () => {
  for (const category of SUGGESTION_CATEGORIES) {
    const input = suggestionInputSchema.parse({ ...valid, category, subject: "x".repeat(160) });
    const message = toSuggestionContactMessage(input);
    assert.equal(contactMessageInputSchema.safeParse(message).success, true);
    assert.equal(message.name, "Juan Dela Cruz");
    assert.equal(message.email, "juan@example.com");
    assert.match(message.subject, /^\[(System suggestion|Website problem|System comment)\] /);
    assert.equal(message.message, valid.message);
    assert.equal(message.website, "");
    assert.equal("projectId" in message, false);
  }
});

test("suggestions reject unknown categories, blank fields, invalid email and oversized messages", () => {
  for (const change of [
    { category: "project_feedback" },
    { name: "   " },
    { email: "not-an-email" },
    { subject: "   " },
    { subject: "x".repeat(161) },
    { message: "too short" },
    { message: "x".repeat(5001) },
  ]) {
    assert.equal(suggestionInputSchema.safeParse({ ...valid, ...change }).success, false);
  }
});

test("suggestions preserve the honeypot so contact submission bot protection still runs", () => {
  const input = suggestionInputSchema.parse({ ...valid, website: "https://bot.example" });
  assert.equal(toSuggestionContactMessage(input).website, "https://bot.example");
});

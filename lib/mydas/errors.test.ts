import assert from "node:assert/strict";
import { test } from "bun:test";

import { MYDAS_FALLBACK_ERROR, MydasUserError, describeMydasError } from "./errors";

function namedError(name: string, message: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { name, ...extra });
}

test("passes through messages written for the MYDAS user", () => {
  assert.equal(describeMydasError(new MydasUserError("That query didn't return any data.")), "That query didn't return any data.");
});

test("maps model schema failures to a rephrase hint without SDK text", () => {
  const message = describeMydasError(namedError("AI_NoObjectGeneratedError", "No object generated: response did not match schema."));
  assert.match(message, /couldn't turn that into a chart/);
  assert.doesNotMatch(message, /schema/i);
});

test("maps statement timeouts found on the driver cause", () => {
  const error = new Error('Failed query: select * from "projects"', {
    cause: Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" }),
  });
  const message = describeMydasError(error);
  assert.match(message, /more data than MYDAS can process/);
  assert.doesNotMatch(message, /select/i);
});

test("maps request timeouts and provider status codes", () => {
  assert.match(describeMydasError(namedError("TimeoutError", "The operation was aborted due to timeout")), /took too long/);
  assert.match(describeMydasError(namedError("AI_APICallError", "quota", { statusCode: 429 })), /busy/);
  assert.match(describeMydasError(namedError("AI_APICallError", "boom", { statusCode: 503 })), /temporarily unavailable/);
  const retry = namedError("AI_RetryError", "Failed after 2 attempts", { lastError: namedError("AI_APICallError", "overloaded", { statusCode: 503 }) });
  assert.match(describeMydasError(retry), /temporarily unavailable/);
});

test("never leaks unknown error text", () => {
  assert.equal(describeMydasError(new Error('relation "x" does not exist')), MYDAS_FALLBACK_ERROR);
  assert.equal(describeMydasError("weird"), MYDAS_FALLBACK_ERROR);
});

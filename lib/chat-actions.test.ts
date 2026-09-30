import assert from "node:assert/strict";
import { test } from "bun:test";

import { CHAT_ACTION_TARGETS, parseActionSpec } from "./chat-actions";

test("parses a valid single-action spec into its allowlisted label and href", () => {
  const spec = parseActionSpec(JSON.stringify({ actions: ["report_issue"] }));
  assert.deepEqual(spec, {
    actions: [{ key: "report_issue", label: "Report an Issue", href: "/report-issue/new" }],
  });
});

test("parses multiple actions and preserves order", () => {
  const spec = parseActionSpec(JSON.stringify({ actions: ["report_issue", "give_feedback"] }));
  assert.deepEqual(spec?.actions.map((a) => a.key), ["report_issue", "give_feedback"]);
});

test("deduplicates repeated action keys", () => {
  const spec = parseActionSpec(JSON.stringify({ actions: ["report_issue", "report_issue"] }));
  assert.equal(spec?.actions.length, 1);
});

test("rejects an action key outside the fixed allowlist", () => {
  assert.equal(parseActionSpec(JSON.stringify({ actions: ["delete_account"] })), null);
});

test("rejects an attempt to supply a custom label or href instead of a key", () => {
  assert.equal(
    parseActionSpec(JSON.stringify({ actions: [{ label: "Click me", href: "https://evil.example" }] })),
    null,
  );
});

test("rejects malformed JSON, empty action lists, and oversized lists", () => {
  assert.equal(parseActionSpec("not json"), null);
  assert.equal(parseActionSpec(JSON.stringify({ actions: [] })), null);
  assert.equal(
    parseActionSpec(JSON.stringify({ actions: Object.keys(CHAT_ACTION_TARGETS).concat(["view_live"]) })),
    null,
  );
});

test("every target href is an internal path, never an external URL", () => {
  for (const target of Object.values(CHAT_ACTION_TARGETS)) {
    assert.ok(target.href.startsWith("/"), `${target.label} href must be internal`);
    assert.doesNotMatch(target.href, /^\/\//);
  }
});

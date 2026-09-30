import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  buildInlineFileHeaders,
  normalizeKnowledgeBaseCategory,
} from "./knowledge-base";

test("knowledge base categories accept user-defined labels and normalize whitespace", () => {
  assert.equal(normalizeKnowledgeBaseCategory("  Memoranda   and   Circulars  "), "Memoranda and Circulars");
  assert.equal(normalizeKnowledgeBaseCategory("Regional Field Reports"), "Regional Field Reports");
});

test("knowledge base categories reject empty, oversized, and control-character labels", () => {
  assert.throws(() => normalizeKnowledgeBaseCategory("   "), /required/i);
  assert.throws(() => normalizeKnowledgeBaseCategory("a".repeat(81)), /80 characters/i);
  assert.throws(() => normalizeKnowledgeBaseCategory("Policy\u0000Draft"), /invalid/i);
});

test("uploaded knowledge base files open inline with safe private-response headers", () => {
  const headers = buildInlineFileHeaders("Field Guide 2026.pdf", "PDF");

  assert.equal(headers["Content-Type"], "application/pdf");
  assert.match(headers["Content-Disposition"], /^inline; filename="Field Guide 2026\.pdf"; filename\*=UTF-8''Field%20Guide%202026\.pdf$/);
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});

test("inline file headers strip unsafe filename characters and map text formats", () => {
  const headers = buildInlineFileHeaders("../notes\r\nInjected.md", "Markdown");

  assert.equal(headers["Content-Type"], "text/markdown; charset=utf-8");
  assert.doesNotMatch(headers["Content-Disposition"], /[\r\n]/);
  assert.doesNotMatch(headers["Content-Disposition"], /\.\./);
});

test("inline file headers keep Unicode names in filename-star with an ASCII fallback", () => {
  const headers = buildInlineFileHeaders("Gabay—Patakaran.pdf", "PDF");

  assert.match(headers["Content-Disposition"], /filename="Gabay_Patakaran\.pdf"/);
  assert.match(headers["Content-Disposition"], /filename\*=UTF-8''Gabay%E2%80%94Patakaran\.pdf/);
});

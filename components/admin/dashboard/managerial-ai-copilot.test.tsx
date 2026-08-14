import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AniaAnswerDownloadButton,
  ManagerialAiCopilot,
  OptionalManagerialAiCopilot,
  formatManagerialFilterContext,
  isManagerialAiFeatureEnabled,
  managerialCopilotErrorMessage,
  managerialFilterContextKey,
} from "./managerial-ai-copilot";

const filters = { program: "AMEFIP", region: "08", health: "atRisk" as const };

test("feature gate is disabled by default and requires exact true", () => {
  assert.equal(isManagerialAiFeatureEnabled(undefined), false);
  assert.equal(isManagerialAiFeatureEnabled("false"), false);
  assert.equal(isManagerialAiFeatureEnabled("TRUE"), false);
  assert.equal(isManagerialAiFeatureEnabled("true"), true);
});

test("disabled optional wrapper hides every ANIA control", () => {
  const disabled = renderToStaticMarkup(createElement(OptionalManagerialAiCopilot, { enabled: false, filters, asOf: "2026-08-10" }));
  const enabled = renderToStaticMarkup(createElement(OptionalManagerialAiCopilot, { enabled: true, filters, asOf: "2026-08-10" }));
  assert.equal(disabled, "");
  assert.match(enabled, /ANIA/);
  assert.doesNotMatch(enabled, /AI Copilot/);
  assert.doesNotMatch(enabled, /Generate executive brief/);
});

test("closed assistant exposes ANIA as the explicit user-triggered control", () => {
  const html = renderToStaticMarkup(createElement(ManagerialAiCopilot, { filters, asOf: "2026-08-10" }));
  assert.match(html, /ANIA/);
  assert.doesNotMatch(html, /AI Copilot/);
  assert.doesNotMatch(html, /Generate executive brief/);
  assert.doesNotMatch(html, /managerial-copilot-dialog/);
});

test("open copilot shows active filters, timestamp, accessible controls, and persistent disclaimer", () => {
  const html = renderToStaticMarkup(createElement(ManagerialAiCopilot, { filters, asOf: "2026-08-10", initialOpen: true }));
  assert.match(html, /managerial-copilot-dialog/);
  assert.match(html, /AMEFIP/);
  assert.match(html, /Region: 08/);
  assert.match(html, /Schedule health: At risk/);
  assert.match(html, /Data as of 2026-08-10/);
  assert.match(html, /AI-generated analysis—verify against the dashboard before making official decisions/);
  assert.match(html, /aria-label="Close ANIA"/);
  assert.match(html, /aria-label="Refresh ANIA"/);
  assert.match(html, /aria-label="Ask ANIA"/);
  assert.match(html, /role="status"/);
});

test("filter context is deterministic and never invents scope", () => {
  assert.equal(formatManagerialFilterContext({}), "All authorized dashboard data");
  assert.equal(formatManagerialFilterContext(filters), "Program: AMEFIP · Region: 08 · Schedule health: At risk");
  assert.equal(managerialFilterContextKey(filters), managerialFilterContextKey({ ...filters }));
  assert.notEqual(managerialFilterContextKey(filters), managerialFilterContextKey({ ...filters, region: "09" }));
});

test("embedded brief conversation stays inline and identifies the captured brief context", () => {
  const html = renderToStaticMarkup(createElement(ManagerialAiCopilot, {
    filters,
    asOf: "2026-08-10",
    initialOpen: true,
    presentation: "embedded",
    initialConversationId: "123e4567-e89b-42d3-a456-426614174000",
  }));
  assert.match(html, /Ask ANIA about this executive brief/);
  assert.match(html, /Data as of 2026-08-10/);
  assert.match(html, /active dashboard filters/i);
  assert.doesNotMatch(html, /role="dialog"/);
  assert.doesNotMatch(html, /fixed inset-x/);
  assert.doesNotMatch(html, /aria-label="Close ANIA"/);
});

test("assistant answers expose a direct PDF download action", () => {
  const html = renderToStaticMarkup(createElement(AniaAnswerDownloadButton, {
    targetId: "ania-answer-1",
    asOf: "2026-08-14",
    answerNumber: 1,
  }));
  assert.match(html, /Download PDF/);
  assert.match(html, /aria-label="Download ANIA answer 1 as PDF"/);
  assert.doesNotMatch(html, /Markdown|Print/);
});

test("executive briefs expose an explicit PDF label", () => {
  const html = renderToStaticMarkup(createElement(AniaAnswerDownloadButton, {
    targetId: "ania-executive-brief-report",
    asOf: "2026-08-14",
    variant: "default",
  }));
  assert.match(html, /Download executive brief PDF/);
  assert.match(html, /aria-label="Download ANIA executive brief as PDF"/);
});

test("cancel, timeout, and provider-unavailable states are visible and retryable", () => {
  assert.equal(managerialCopilotErrorMessage(true, false, null), "Response cancelled. You can retry the last question.");
  assert.equal(managerialCopilotErrorMessage(true, true, null), "The response timed out. You can retry the last question.");
  assert.equal(managerialCopilotErrorMessage(false, false, new Error("offline")), "ANIA is temporarily unavailable. You can retry the last question.");
});

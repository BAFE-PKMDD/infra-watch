import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
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

test("disabled optional wrapper hides every copilot control", () => {
  const disabled = renderToStaticMarkup(createElement(OptionalManagerialAiCopilot, { enabled: false, filters, asOf: "2026-08-10" }));
  const enabled = renderToStaticMarkup(createElement(OptionalManagerialAiCopilot, { enabled: true, filters, asOf: "2026-08-10" }));
  assert.equal(disabled, "");
  assert.match(enabled, /AI Copilot/);
  assert.doesNotMatch(enabled, /Generate executive brief/);
});

test("closed copilot exposes only explicit user-triggered controls", () => {
  const html = renderToStaticMarkup(createElement(ManagerialAiCopilot, { filters, asOf: "2026-08-10" }));
  assert.match(html, /AI Copilot/);
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
  assert.match(html, /aria-label="Close AI Copilot"/);
  assert.match(html, /aria-label="Refresh AI Copilot"/);
  assert.match(html, /aria-label="Ask the Managerial AI Copilot"/);
  assert.match(html, /role="status"/);
});

test("filter context is deterministic and never invents scope", () => {
  assert.equal(formatManagerialFilterContext({}), "All authorized dashboard data");
  assert.equal(formatManagerialFilterContext(filters), "Program: AMEFIP · Region: 08 · Schedule health: At risk");
  assert.equal(managerialFilterContextKey(filters), managerialFilterContextKey({ ...filters }));
  assert.notEqual(managerialFilterContextKey(filters), managerialFilterContextKey({ ...filters, region: "09" }));
});

test("cancel, timeout, and provider-unavailable states are visible and retryable", () => {
  assert.equal(managerialCopilotErrorMessage(true, false, null), "Response cancelled. You can retry the last question.");
  assert.equal(managerialCopilotErrorMessage(true, true, null), "The response timed out. You can retry the last question.");
  assert.equal(managerialCopilotErrorMessage(false, false, new Error("offline")), "The AI Copilot is temporarily unavailable. You can retry the last question.");
});

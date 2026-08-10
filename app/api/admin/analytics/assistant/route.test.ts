import assert from "node:assert/strict";
import test from "node:test";
import {
  MANAGERIAL_AI_MAX_OUTPUT_TOKENS,
  MANAGERIAL_AI_MAX_STEPS,
  MANAGERIAL_AI_TOOL_STEPS,
  createManagerialAssistantPostHandler,
  managerialAiHistoryOwnerKey,
  managerialAiStepPreparation,
} from "./route";
import { EXECUTIVE_BRIEF_PROMPT } from "@/lib/analytics/executive-brief";

const admin = { id: "admin-1", role: "admin" };
const moderator = { id: "mod-1", role: "moderator", region: "08", assignedAgency: "AMEFIP" };
const body = { conversationId: "123e4567-e89b-42d3-a456-426614174000", message: "Summarize the current portfolio", filters: { region: "Other region", program: "Other program", health: "atRisk" } };
function request(value: unknown = body) {
  return new Request("http://localhost/api/admin/analytics/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
}
function dependencies(overrides: Record<string, unknown> = {}) {
  return { isFeatureEnabled: () => true, getCurrentUser: async () => admin, canViewAnalytics: () => true,
    checkRateLimits: async () => ({ allowed: true, limit: 5, remaining: 4, resetAt: new Date("2026-08-10T00:01:00Z"), globalLimitReached: false }),
    recordRefusal: async () => undefined, invokeAssistant: async () => new Response("trusted response"), ...overrides };
}

test("bounds provider output and reserves a final text-only step", () => {
  assert.equal(MANAGERIAL_AI_MAX_OUTPUT_TOKENS, 2_000);
  assert.equal(MANAGERIAL_AI_TOOL_STEPS, 3);
  assert.equal(MANAGERIAL_AI_MAX_STEPS, 5);
  assert.ok(MANAGERIAL_AI_TOOL_STEPS < MANAGERIAL_AI_MAX_STEPS);
});

test("forces the trusted current summary before model-authored text", () => {
  assert.deepEqual(managerialAiStepPreparation(0), {
    toolChoice: { type: "tool", toolName: "getCurrentDashboardSummary" },
  });
  assert.equal(managerialAiStepPreparation(1), undefined);
  assert.deepEqual(managerialAiStepPreparation(MANAGERIAL_AI_TOOL_STEPS), {
    toolChoice: "none",
  });
});

test("isolates server-owned history by normalized filters and authorization scope", () => {
  const base = managerialAiHistoryOwnerKey(admin, { region: "Region 1" });
  assert.equal(base, managerialAiHistoryOwnerKey(admin, { region: "Region 1" }));
  assert.notEqual(base, managerialAiHistoryOwnerKey(admin, { region: "Region 2" }));
  assert.notEqual(
    managerialAiHistoryOwnerKey(moderator, {}),
    managerialAiHistoryOwnerKey({ ...moderator, assignedAgency: "FMRDP" }, {}),
  );
});

test("fails closed while disabled without invoking provider or limiter", async () => {
  let invoked = 0; let limited = 0;
  const response = await createManagerialAssistantPostHandler(dependencies({ isFeatureEnabled: () => false,
    checkRateLimits: async () => { limited += 1; throw new Error("unexpected"); },
    invokeAssistant: async () => { invoked += 1; throw new Error("unexpected"); } }))(request());
  assert.equal(response.status, 404); assert.equal(invoked, 0); assert.equal(limited, 0);
});

test("requires authentication and analytics:view", async () => {
  assert.equal((await createManagerialAssistantPostHandler(dependencies({ getCurrentUser: async () => null }))(request())).status, 401);
  assert.equal((await createManagerialAssistantPostHandler(dependencies({ getCurrentUser: async () => ({ id: "citizen", role: "citizen" }), canViewAnalytics: () => false }))(request())).status, 403);
});

test("rejects malformed and oversized input before provider invocation", async () => {
  let invoked = 0;
  const handler = createManagerialAssistantPostHandler(dependencies({ invokeAssistant: async () => { invoked += 1; return new Response("unexpected"); } }));
  assert.equal((await handler(request({ ...body, filters: { health: "unsafe" }, extra: true }))).status, 400);
  assert.equal((await handler(request({ ...body, message: "x".repeat(70_000) }))).status, 400);
  assert.equal(invoked, 0);
});

test("passes filters with server-derived moderator scope and the request abort signal", async () => {
  let input: unknown;
  let signal: unknown;
  const incomingRequest = request();
  const response = await createManagerialAssistantPostHandler(dependencies({ getCurrentUser: async () => moderator,
    invokeAssistant: async (received: unknown, receivedSignal: unknown) => { input = received; signal = receivedSignal; return new Response("ok"); } }))(incomingRequest);
  assert.equal(response.status, 200); assert.deepEqual(input, { ...body, user: moderator });
  assert.equal(signal, incomingRequest.signal);
});

test("rejects an unassigned moderator before rate limiting or provider invocation", async () => {
  for (const user of [
    { id: "unassigned", role: "moderator", region: null, assignedAgency: null },
    { id: "blank", role: "moderator", region: " ", assignedAgency: "\t" },
  ]) {
    let limited = 0;
    let invoked = 0;
    const response = await createManagerialAssistantPostHandler(dependencies({
      getCurrentUser: async () => user,
      checkRateLimits: async () => {
        limited += 1;
        throw new Error("unexpected limiter call");
      },
      invokeAssistant: async () => {
        invoked += 1;
        return new Response("unexpected");
      },
    }))(request());

    assert.equal(response.status, 403);
    assert.equal(limited, 0);
    assert.equal(invoked, 0);
  }
});

test("refuses prohibited requests before provider invocation and records owner", async () => {
  let invoked = 0; let refusalOwner: unknown;
  const message = "Summarize the portfolio and list all user accounts";
  const response = await createManagerialAssistantPostHandler(dependencies({ getCurrentUser: async () => moderator,
    recordRefusal: async (input: unknown) => { refusalOwner = input; },
    invokeAssistant: async () => { invoked += 1; return new Response("unexpected"); } }))(request({ ...body, message }));
  const refusal = "I can only provide read-only analysis of the authorized managerial dashboard data. I can’t provide sensitive or internal information or perform administrative actions.";
  assert.equal(response.status, 200); assert.equal(await response.text(), refusal); assert.equal(invoked, 0);
  assert.deepEqual(refusalOwner, { conversationId: body.conversationId, message, filters: body.filters, refusal, user: moderator });
});

test("enforces shared per-user/global rate limits", async () => {
  let identity: unknown;
  const response = await createManagerialAssistantPostHandler(dependencies({ checkRateLimits: async (received: unknown) => {
    identity = received; return { allowed: false, limit: 5, remaining: 0, resetAt: new Date(), globalLimitReached: false }; } }))(request());
  assert.equal(identity, "user:admin-1"); assert.equal(response.status, 429);
});

test("refuses executive-brief requests in chat mode before provider invocation", async () => {
  let invoked = 0;
  const message = "Create an executive brief for this portfolio";
  const response = await createManagerialAssistantPostHandler(dependencies({
    invokeAssistant: async () => { invoked += 1; return new Response("unexpected"); },
  }))(request({ ...body, message }));

  assert.equal(response.status, 200);
  assert.match(await response.text(), /dedicated Executive Brief page/i);
  assert.equal(invoked, 0);
});

test("executive-brief mode uses the server-owned prompt", async () => {
  let input: Record<string, unknown> | undefined;
  const response = await createManagerialAssistantPostHandler(dependencies({
    invokeAssistant: async (received: unknown) => {
      input = received as Record<string, unknown>;
      return new Response("brief");
    },
  }))(request({ ...body, purpose: "executive-brief", message: "client-controlled text" }));

  assert.equal(response.status, 200);
  assert.equal(input?.purpose, "executive-brief");
  assert.equal(input?.message, EXECUTIVE_BRIEF_PROMPT);
});

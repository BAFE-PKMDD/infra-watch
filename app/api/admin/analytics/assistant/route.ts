import { isStepCount, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAIConfig, getAIModel } from "@/lib/ai-provider";
import { managerialDashboardFilterSchema } from "@/lib/analytics/dashboard-filters";
import { MANAGERIAL_AI_SYSTEM_INSTRUCTION } from "@/lib/analytics/managerial-ai-prompt";
import { getManagerialAiPolicyRefusal } from "@/lib/analytics/managerial-ai-policy";
import { createManagerialAiTools } from "@/lib/analytics/managerial-ai-tools";
import { getManagerialDashboardData } from "@/lib/analytics/managerial-dashboard-query";
import { EXECUTIVE_BRIEF_PROMPT } from "@/lib/analytics/executive-brief";
import {
  completeChatHistoryTurn,
  failChatHistoryTurn,
  getServerOwnedChatHistory,
  startChatHistoryTurn,
} from "@/lib/chat-history";
import { createChatHistoryLifecycle } from "@/lib/chat-history-lifecycle";
import { checkChatRateLimits, getChatOwnerKey } from "@/lib/chat-rate-limit";
import { getChatResponseTimeoutMs, readBoundedJsonBody } from "@/lib/chat-request";
import {
  GENERIC_CHAT_ERROR,
  createChatResponseStream,
  createChatStreamTerminalState,
} from "@/lib/chat-stream";
import { hasPermission } from "@/lib/permissions";
import { hasAssignedModeratorScope, type ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";
export const MANAGERIAL_AI_MAX_OUTPUT_TOKENS = 2_000;
export const MANAGERIAL_AI_TOOL_STEPS = 3;
export const MANAGERIAL_AI_MAX_STEPS = 5;
export const EXECUTIVE_BRIEF_MAX_OUTPUT_TOKENS = 4_000;
export const EXECUTIVE_BRIEF_TOOL_STEPS = 5;
export const EXECUTIVE_BRIEF_MAX_STEPS = 7;
const EXECUTIVE_BRIEF_TIMEOUT_MS = 110_000;

export function assistantGenerationLimits(purpose: "chat" | "executive-brief") {
  return purpose === "executive-brief"
    ? {
        maxOutputTokens: EXECUTIVE_BRIEF_MAX_OUTPUT_TOKENS,
        toolSteps: EXECUTIVE_BRIEF_TOOL_STEPS,
        maxSteps: EXECUTIVE_BRIEF_MAX_STEPS,
        timeoutMs: EXECUTIVE_BRIEF_TIMEOUT_MS,
      }
    : {
        maxOutputTokens: MANAGERIAL_AI_MAX_OUTPUT_TOKENS,
        toolSteps: MANAGERIAL_AI_TOOL_STEPS,
        maxSteps: MANAGERIAL_AI_MAX_STEPS,
        timeoutMs: getChatResponseTimeoutMs(),
      };
}

export function managerialAiStepPreparation(stepNumber: number, toolSteps = MANAGERIAL_AI_TOOL_STEPS) {
  if (stepNumber === 0) {
    return {
      toolChoice: { type: "tool" as const, toolName: "getCurrentDashboardSummary" as const },
    };
  }
  return stepNumber >= toolSteps
    ? { toolChoice: "none" as const }
    : undefined;
}

const assistantRequestSchema = z
  .object({
    conversationId: z.uuid(),
    message: z.string().trim().min(1).max(4_000),
    filters: managerialDashboardFilterSchema.default({}),
    purpose: z.enum(["chat", "executive-brief"]).default("chat"),
    dashboardContext: z.object({
      asOf: z.iso.date(),
      lastSuccessfulSyncAt: z.iso.datetime({ offset: true }).nullable(),
    }).strict().optional(),
  })
  .strict();

type AssistantUser = ScopedUser & { id: string } & Record<string, unknown>;
type DashboardContext = {
  asOf: string;
  lastSuccessfulSyncAt: string | null;
};
type AssistantInput = {
  conversationId: string;
  message: string;
  filters: ManagerialDashboardFilters;
  user: AssistantUser;
  purpose?: "chat" | "executive-brief";
  dashboardContext?: DashboardContext;
};
type RateLimitResult = Awaited<ReturnType<typeof checkChatRateLimits>>;

type AssistantRouteDependencies = {
  isFeatureEnabled: () => boolean;
  getCurrentUser: () => Promise<AssistantUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  checkRateLimits: (identity: string) => Promise<RateLimitResult>;
  recordRefusal: (input: AssistantInput & { refusal: string }) => Promise<void>;
  invokeAssistant: (input: AssistantInput, requestSignal: AbortSignal) => Promise<Response>;
  reportError?: (error: unknown) => void;
};

export function managerialAiHistoryOwnerKey(
  user: AssistantUser,
  filters: ManagerialDashboardFilters,
) {
  return getChatOwnerKey(`managerial:${JSON.stringify({
    userId: user.id,
    role: user.role ?? null,
    assignedRegion: user.assignedRegion ?? user.region ?? null,
    assignedAgency: user.assignedAgency ?? null,
    program: filters.program ?? null,
    year: filters.year ?? null,
    region: filters.region ?? null,
    province: filters.province ?? null,
    projectType: filters.projectType ?? null,
    status: filters.status ?? null,
    health: filters.health ?? null,
  })}`);
}

export function managerialDashboardContextMatches(
  expected: DashboardContext | undefined,
  actual: DashboardContext,
) {
  return !expected || (
    expected.asOf === actual.asOf
    && expected.lastSuccessfulSyncAt === actual.lastSuccessfulSyncAt
  );
}

async function recordManagerialRefusal(input: AssistantInput & { refusal: string }) {
  const { provider, modelId } = getAIConfig();
  const historyId = await startChatHistoryTurn({
    conversationId: input.conversationId,
    ownerKey: managerialAiHistoryOwnerKey(input.user, input.filters),
    surface: "managerial_ai",
    userId: input.user.id,
    userMessage: input.message,
    provider,
    model: modelId,
  });
  await completeChatHistoryTurn(historyId, {
    assistantMessage: input.refusal,
    status: "refused",
    durationMs: 0,
    finishReason: "policy_refusal",
  });
}

async function invokeManagerialAssistant(
  input: AssistantInput,
  requestSignal: AbortSignal,
) {
  const startedAt = Date.now();
  const ownerKey = managerialAiHistoryOwnerKey(input.user, input.filters);
  const { provider, modelId } = getAIConfig();
  const historyId = await startChatHistoryTurn({
    conversationId: input.conversationId,
    ownerKey,
    surface: "managerial_ai",
    userId: input.user.id,
    userMessage: input.message,
    provider,
    model: modelId,
  });

  let model;
  try {
    model = getAIModel();
  } catch {
    await failChatHistoryTurn(historyId, "provider_not_configured", Date.now() - startedAt);
    return NextResponse.json({ error: GENERIC_CHAT_ERROR }, { status: 503 });
  }

  const dashboardData = await getManagerialDashboardData(input.filters, input.user);
  const actualDashboardContext = {
    asOf: dashboardData.asOf,
    lastSuccessfulSyncAt: dashboardData.freshness.lastSuccessfulSyncAt,
  };
  if (!managerialDashboardContextMatches(input.dashboardContext, actualDashboardContext)) {
    await failChatHistoryTurn(historyId, "dashboard_context_changed", Date.now() - startedAt);
    return NextResponse.json(
      { error: "Dashboard data changed. Refresh the executive brief before asking ANIA." },
      { status: 409 },
    );
  }

  const messages = [
    ...(await getServerOwnedChatHistory({
      conversationId: input.conversationId,
      ownerKey,
      surface: "managerial_ai",
      userId: input.user.id,
    })),
    { role: "user" as const, content: input.message },
  ];
  const terminalState = createChatStreamTerminalState();
  const historyLifecycle = createChatHistoryLifecycle();
  const limits = assistantGenerationLimits(input.purpose ?? "chat");
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    terminalState.markTimeout("The response timed out before it could finish. Please try again.");
    timeoutController.abort();
  }, limits.timeoutMs);
  let completion: {
    modelId: string;
    toolNames: string[];
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    finishReason: string;
  } | null = null;

  const result = streamText({
    model,
    system: MANAGERIAL_AI_SYSTEM_INSTRUCTION,
    messages,
    tools: createManagerialAiTools({
      filters: input.filters,
      user: input.user,
      getDashboardData: async () => dashboardData,
    }),
    maxOutputTokens: limits.maxOutputTokens,
    prepareStep: ({ stepNumber }) => managerialAiStepPreparation(stepNumber, limits.toolSteps),
    stopWhen: isStepCount(limits.maxSteps),
    abortSignal: AbortSignal.any([requestSignal, timeoutController.signal]),
    onEnd: ({ usage, toolCalls, finishReason, model: completedModel }) => {
      completion = {
        modelId: completedModel.modelId,
        toolNames: [...new Set(toolCalls.map((call) => call.toolName))],
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        finishReason,
      };
      clearTimeout(timeoutId);
    },
    onError: async () => {
      terminalState.markProviderError();
      clearTimeout(timeoutId);
      await historyLifecycle.settleTerminal(() =>
        failChatHistoryTurn(historyId, "provider_stream_failed", Date.now() - startedAt),
      );
    },
    onAbort: async () => {
      clearTimeout(timeoutId);
      await historyLifecycle.settleTerminal(() =>
        failChatHistoryTurn(
          historyId,
          terminalState.getNotice() ? "response_timeout" : "request_aborted",
          Date.now() - startedAt,
        ),
      );
    },
  });

  const stream = createChatResponseStream({
    textStream: result.textStream,
    terminalState,
    onCancel: () => {
      terminalState.markRequestAborted();
      timeoutController.abort();
      void historyLifecycle.settleTerminal(() =>
        failChatHistoryTurn(historyId, "request_aborted", Date.now() - startedAt),
      );
    },
    onComplete: (emittedText) => {
      if (!completion || !emittedText.trim() || historyLifecycle.isInvalidated()) return;
      const metadata = completion;
      historyLifecycle.beginCompletion(() =>
        completeChatHistoryTurn(historyId, {
          assistantMessage: emittedText,
          model: metadata.modelId,
          toolNames: metadata.toolNames,
          inputTokens: metadata.inputTokens,
          outputTokens: metadata.outputTokens,
          totalTokens: metadata.totalTokens,
          durationMs: Date.now() - startedAt,
          finishReason: metadata.finishReason,
        }),
      );
    },
    onFinally: () => clearTimeout(timeoutId),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const defaultDependencies: AssistantRouteDependencies = {
  isFeatureEnabled: () => process.env.ENABLE_MANAGERIAL_AI === "true",
  getCurrentUser: async () => {
    const user = (await getCurrentUser()) as AssistantUser | null;
    return user?.id ? user : null;
  },
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  checkRateLimits: checkChatRateLimits,
  recordRefusal: recordManagerialRefusal,
  invokeAssistant: invokeManagerialAssistant,
  reportError: () => console.error("Managerial AI assistant request failed"),
};

function withHeaders(response: Response, rateLimit?: RateLimitResult) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (rateLimit) {
    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt.getTime() / 1_000)));
  }
  return response;
}

export function createManagerialAssistantPostHandler(
  dependencies: AssistantRouteDependencies = defaultDependencies,
) {
  return async function POST(request: Request) {
    if (!dependencies.isFeatureEnabled()) {
      return withHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    const user = await dependencies.getCurrentUser();
    if (!user) return withHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    if (!dependencies.canViewAnalytics(user.role)) {
      return withHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (!hasAssignedModeratorScope(user)) {
      return withHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return withHeaders(NextResponse.json({ error: "Expected application/json" }, { status: 415 }));
    }

    let rawBody: unknown;
    try {
      rawBody = await readBoundedJsonBody(request);
    } catch {
      return withHeaders(NextResponse.json({ error: "Invalid or oversized request" }, { status: 400 }));
    }
    const parsed = assistantRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return withHeaders(NextResponse.json({ error: "Invalid or oversized request" }, { status: 400 }));
    }

    let rateLimit: RateLimitResult;
    try {
      rateLimit = await dependencies.checkRateLimits(`user:${user.id}`);
    } catch (error) {
      dependencies.reportError?.(error);
      return withHeaders(NextResponse.json({ error: GENERIC_CHAT_ERROR }, { status: 503 }));
    }
    if (!rateLimit.allowed) {
      return withHeaders(
        NextResponse.json(
          { error: rateLimit.globalLimitReached ? "The AI daily usage limit has been reached." : "Too many requests. Please wait before retrying." },
          { status: rateLimit.globalLimitReached ? 503 : 429 },
        ),
        rateLimit,
      );
    }

    const purpose = parsed.data.purpose;
    const input: AssistantInput = {
      conversationId: parsed.data.conversationId,
      message: purpose === "executive-brief" ? EXECUTIVE_BRIEF_PROMPT : parsed.data.message,
      filters: parsed.data.filters,
      user,
      ...(purpose === "executive-brief" ? { purpose } : {}),
      ...(parsed.data.dashboardContext ? { dashboardContext: parsed.data.dashboardContext } : {}),
    };
    const refusal = getManagerialAiPolicyRefusal(input.message, purpose);
    if (refusal) {
      try {
        await dependencies.recordRefusal({ ...input, refusal });
      } catch (error) {
        dependencies.reportError?.(error);
        return withHeaders(NextResponse.json({ error: GENERIC_CHAT_ERROR }, { status: 503 }), rateLimit);
      }
      return withHeaders(new Response(refusal, { headers: { "Content-Type": "text/plain; charset=utf-8" } }), rateLimit);
    }

    try {
      return withHeaders(
        await dependencies.invokeAssistant(input, request.signal),
        rateLimit,
      );
    } catch (error) {
      dependencies.reportError?.(error);
      return withHeaders(NextResponse.json({ error: GENERIC_CHAT_ERROR }, { status: 503 }), rateLimit);
    }
  };
}

export const POST = createManagerialAssistantPostHandler();

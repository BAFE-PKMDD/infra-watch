import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { streamText, isStepCount } from "ai";
import { getAIConfig, getAIModel } from "@/lib/ai-provider";
import { auth } from "@/lib/auth";
import {
  completeChatHistoryTurn,
  failChatHistoryTurn,
  getServerOwnedChatHistory,
  startChatHistoryTurn,
} from "@/lib/chat-history";
import { createChatHistoryLifecycle } from "@/lib/chat-history-lifecycle";
import {
  CHAT_SCOPE_INSTRUCTION,
  getChatPolicyRefusal,
} from "@/lib/chat-policy";
import {
  getChatResponseTimeoutMs,
  parseChatRequest,
  readBoundedJsonBody,
} from "@/lib/chat-request";
import {
  checkChatRateLimits,
  getChatClientIdentity,
  getChatOwnerKey,
} from "@/lib/chat-rate-limit";
import { chatTools } from "@/lib/chat-tools";
import {
  GENERIC_CHAT_ERROR,
  createChatResponseStream,
  createChatStreamTerminalState,
} from "@/lib/chat-stream";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_INSTRUCTION = `You are INFRA Watch AI, an assistant for the Philippine Bureau of Agriculture and Fisheries Engineering (BAFE) infrastructure monitoring platform.

You help citizens, government officials, and stakeholders find information about agricultural and fisheries infrastructure projects (roads, irrigation systems, farm-to-market roads, post-harvest facilities, buildings, etc).

Guidelines:
- ${CHAT_SCOPE_INSTRUCTION}
- Use the provided tools to search and retrieve project data from the database.
- Always cite specific project names and ABEMIS IDs when available.
- Respond in the same language the user uses (Filipino or English).
- If no data matches the query, say so honestly and suggest refining the search.
- Keep responses concise, scannable, and avoid repeating the same facts in prose.
- Choose the clearest presentation for the data:
  - Use short prose for direct answers or explanations.
  - Use a compact Markdown table for three or more comparable projects. Hyperlink the project name using its exact returned URL. Prefer columns such as Project, Location, Type, Budget, and Status. Omit the separate ABEMIS ID column unless the user specifically asks for identifiers, because the linked project name already opens the overview.
  - Use bullets or small project cards for one or two projects.
  - Use a chart only for aggregate statistics, distributions, rankings, trends, or numeric comparisons—not for individual project details or identifiers.
- When a chart materially improves the answer, emit one fenced \`chart\` JSON block using exactly this shape:
  \`\`\`chart
  {"type":"bar","title":"Projects by status","valueLabel":"Projects","data":[{"label":"Completed","value":120},{"label":"Ongoing","value":45}]}
  \`\`\`
  Allowed chart types are "bar" and "pie". Use "pie" for parts of a whole and "bar" for comparisons or rankings. You may add "valuePrefix":"₱" or a short "valueSuffix". Include 12 or fewer data points and numeric values only.
- Do not repeat all chart values in a second long list or table. Add only a brief takeaway after the chart.
- When listing projects, include useful details such as name, status, location, budget, and ABEMIS ID without repeating labels unnecessarily.
- Make every listed project actionable. Use the exact local \`url\` returned with the project data to link the project name or add a concise \`[View project](/projects/...)\` link that opens its public project overview page.
- Never invent, alter, or guess a project URL. If the project data has no \`url\`, show the identifier as plain text instead.
- For statistical questions, use getProjectStats to get aggregate data.
- For a project-listing request, call searchProjects once with the requested filters and answer directly from those results. Do not repeatedly broaden the search or call getProjectById for every listed project because searchProjects already returns the relevant details.
- You can call multiple tools if needed to answer a complex question.
- Do not make up project data. Only report what the tools return.`;

function logChatError(requestId: string, code: string, error: unknown) {
  const details =
    error && typeof error === "object"
      ? {
          errorName:
            "name" in error && typeof error.name === "string"
              ? error.name
              : "UnknownError",
          statusCode:
            "statusCode" in error && typeof error.statusCode === "number"
              ? error.statusCode
              : undefined,
        }
      : { errorName: "UnknownError", statusCode: undefined };

  console.error(
    "[Chat API]",
    JSON.stringify({ requestId, code, ...details }),
  );
}

async function getOptionalUserId(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function getTrustedProxyIp(request: NextRequest) {
  if (process.env.CHAT_TRUST_PROXY !== "true") return null;

  const candidate =
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  return isIP(candidate) ? candidate : null;
}

function applyRateLimitHeaders(
  response: Response,
  clientId: string | null,
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: Date;
  },
) {
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(rateLimit.resetAt.getTime() / 1_000)),
  );

  if (clientId) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `infra_chat_client=${clientId}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`,
    );
  }

  return response;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let historyId: string | null = null;
  let finalizeResponse = (response: Response) => response;

  try {
    const userId = await getOptionalUserId(request);
    if (process.env.CHAT_REQUIRE_AUTH === "true" && !userId) {
      return NextResponse.json(
        { error: "Sign in to use the AI assistant." },
        { status: 401 },
      );
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json(
        { error: "The chat request must use application/json." },
        { status: 415 },
      );
    }

    const trustedProxyIp = getTrustedProxyIp(request);
    if (
      process.env.NODE_ENV === "production" &&
      !userId &&
      !trustedProxyIp
    ) {
      return NextResponse.json(
        { error: "Anonymous chat is temporarily unavailable." },
        { status: 503 },
      );
    }

    const identity = getChatClientIdentity({
      userId,
      conversationId: requestId,
      cookieClientId: request.cookies.get("infra_chat_client")?.value ?? null,
      trustedProxyIp,
    });
    const ownerKey = getChatOwnerKey(identity.value);
    let rateLimit;
    try {
      rateLimit = await checkChatRateLimits(identity.value);
    } catch (error) {
      logChatError(requestId, "rate_limit_unavailable", error);
      return NextResponse.json(
        { error: "The AI service is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }

    if (!rateLimit.allowed) {
      const status = rateLimit.globalLimitReached ? 503 : 429;
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            error: rateLimit.globalLimitReached
              ? "The AI assistant has reached its daily usage limit. Please try again later."
              : "Too many messages. Please wait a minute before sending another.",
          },
          { status },
        ),
        identity.clientId,
        rateLimit,
      );
    }

    finalizeResponse = (response) =>
      applyRateLimitHeaders(response, identity.clientId, rateLimit);

    let rawBody: unknown;
    try {
      rawBody = await readBoundedJsonBody(request);
    } catch {
      return finalizeResponse(
        NextResponse.json(
          { error: "The chat request is invalid or too large." },
          { status: 400 },
        ),
      );
    }

    const parsedRequest = parseChatRequest(rawBody);
    if (!parsedRequest.success) {
      return finalizeResponse(
        NextResponse.json(
          { error: "The chat request contains invalid or oversized data." },
          { status: 400 },
        ),
      );
    }

    const { conversationId, message } = parsedRequest.data;
    const { provider, modelId } = getAIConfig();
    try {
      historyId = await startChatHistoryTurn({
        conversationId,
        ownerKey,
        userId,
        userMessage: message,
        provider,
        model: modelId,
      });
    } catch (error) {
      logChatError(requestId, "history_start_failed", error);
      return finalizeResponse(
        NextResponse.json(
          { error: "Chat history could not be saved. Please try again." },
          { status: 503 },
        ),
      );
    }

    const policyRefusal = getChatPolicyRefusal(message);
    if (policyRefusal) {
      await completeChatHistoryTurn(historyId, {
        assistantMessage: policyRefusal,
        status: "refused",
        durationMs: Date.now() - startedAt,
        finishReason: "policy_refusal",
      });

      return finalizeResponse(
        new NextResponse(policyRefusal, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Request-Id": requestId,
          },
        }),
      );
    }

    let model;
    try {
      model = getAIModel();
    } catch (error) {
      await failChatHistoryTurn(
        historyId,
        "provider_not_configured",
        Date.now() - startedAt,
      );
      logChatError(requestId, "provider_not_configured", error);
      return finalizeResponse(
        NextResponse.json(
          { error: GENERIC_CHAT_ERROR },
          { status: 503, headers: { "X-Request-Id": requestId } },
        ),
      );
    }

    const messages = [
      ...(await getServerOwnedChatHistory({ conversationId, ownerKey, userId })),
      { role: "user" as const, content: message },
    ];
    type CompletionMetadata = {
      modelId: string;
      toolNames: string[];
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      finishReason: string;
    };
    let resolveCompletionMetadata!: (value: CompletionMetadata | null) => void;
    const completionMetadata = new Promise<CompletionMetadata | null>((resolve) => {
      resolveCompletionMetadata = resolve;
    });
    const historyLifecycle = createChatHistoryLifecycle({
      onWriteError: (error) => {
        logChatError(requestId, "history_write_failed", error);
      },
    });
    const settleHistoryFailure = (errorCode: string) =>
      historyLifecycle.settleTerminal(async () => {
        if (!historyId) return;
        await failChatHistoryTurn(historyId, errorCode, Date.now() - startedAt);
      });
    const terminalState = createChatStreamTerminalState();
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      terminalState.markTimeout(
        "The response timed out before it could finish. Please try again.",
      );
      void settleHistoryFailure("response_timeout");
      timeoutController.abort();
    }, getChatResponseTimeoutMs());

    const result = streamText({
      model,
      system: SYSTEM_INSTRUCTION,
      messages,
      tools: chatTools,
      prepareStep: ({ stepNumber }) =>
        stepNumber >= 3 ? { toolChoice: "none" as const } : undefined,
      stopWhen: isStepCount(5),
      abortSignal: AbortSignal.any([
        request.signal,
        timeoutController.signal,
      ]),
      onEnd: async ({
        usage,
        toolCalls,
        finishReason,
        model: completedModel,
      }) => {
        clearTimeout(timeoutId);
        resolveCompletionMetadata({
          modelId: completedModel.modelId,
          toolNames: [...new Set(toolCalls.map((call) => call.toolName))],
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          finishReason,
        });
      },
      onError: async ({ error }) => {
        resolveCompletionMetadata(null);
        terminalState.markProviderError();
        clearTimeout(timeoutId);
        void settleHistoryFailure("provider_stream_failed");
        logChatError(requestId, "provider_stream_failed", error);
      },
      onAbort: async () => {
        resolveCompletionMetadata(null);
        clearTimeout(timeoutId);
        if (request.signal.aborted) terminalState.markRequestAborted();
        void settleHistoryFailure(
          terminalState.getNotice() ? "response_timeout" : "request_aborted",
        );
      },
    });

    const responseStream = createChatResponseStream({
      textStream: result.textStream,
      terminalState,
      onError: (error) => {
        logChatError(requestId, "text_stream_failed", error);
      },
      onCancel: () => {
        terminalState.markRequestAborted();
        void settleHistoryFailure("request_aborted");
        timeoutController.abort();
      },
      onComplete: async (emittedText) => {
        const metadata = await completionMetadata;
        const completedHistoryId = historyId;
        if (
          !metadata ||
          historyLifecycle.isInvalidated() ||
          !completedHistoryId ||
          request.signal.aborted ||
          timeoutController.signal.aborted
        ) {
          return;
        }
        if (!emittedText.trim()) {
          void settleHistoryFailure("empty_provider_response");
          return;
        }
        historyLifecycle.beginCompletion(async () => {
          await completeChatHistoryTurn(completedHistoryId, {
            assistantMessage: emittedText,
            model: metadata.modelId,
            toolNames: metadata.toolNames,
            inputTokens: metadata.inputTokens,
            outputTokens: metadata.outputTokens,
            totalTokens: metadata.totalTokens,
            durationMs: Date.now() - startedAt,
            finishReason: metadata.finishReason,
          });
        });
      },
      onFinally: () => clearTimeout(timeoutId),
    });

    return finalizeResponse(
      new Response(responseStream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      }),
    );
  } catch (error) {
    if (historyId) {
      try {
        await failChatHistoryTurn(
          historyId,
          "internal_error",
          Date.now() - startedAt,
        );
      } catch (historyError) {
        logChatError(requestId, "history_internal_update_failed", historyError);
      }
    }
    logChatError(requestId, "internal_error", error);
    return finalizeResponse(
      NextResponse.json(
        { error: GENERIC_CHAT_ERROR },
        { status: 500, headers: { "X-Request-Id": requestId } },
      ),
    );
  }
}

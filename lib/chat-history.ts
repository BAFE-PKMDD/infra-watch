import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { chatHistory } from "@/lib/db/schema";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 365;

export function getChatHistoryExpiry(
  now = new Date(),
  configuredDays = process.env.CHAT_HISTORY_RETENTION_DAYS,
) {
  const parsedDays = Number.parseInt(configuredDays ?? "", 10);
  const retentionDays = Number.isFinite(parsedDays)
    ? Math.min(Math.max(parsedDays, 1), MAX_RETENTION_DAYS)
    : DEFAULT_RETENTION_DAYS;

  return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1_000);
}

export async function purgeExpiredChatHistory(now = new Date()) {
  const deleted = await db
    .delete(chatHistory)
    .where(lt(chatHistory.expiresAt, now))
    .returning({ id: chatHistory.id });
  return deleted.length;
}

const MAX_MODEL_HISTORY_TURNS = 10;
const MAX_MODEL_HISTORY_MESSAGE_CHARS = 4_000;
const MAX_MODEL_HISTORY_TOTAL_CHARS = 20_000;

export function buildServerOwnedChatHistory(
  rows: Array<{ userMessage: string; assistantMessage: string | null }>,
) {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  let totalCharacters = 0;

  for (const row of rows) {
    if (!row.assistantMessage) continue;
    const pair = [
      {
        role: "user" as const,
        content: row.userMessage.slice(0, MAX_MODEL_HISTORY_MESSAGE_CHARS),
      },
      {
        role: "assistant" as const,
        content: row.assistantMessage.slice(0, MAX_MODEL_HISTORY_MESSAGE_CHARS),
      },
    ];
    const pairCharacters = pair[0].content.length + pair[1].content.length;
    if (totalCharacters + pairCharacters > MAX_MODEL_HISTORY_TOTAL_CHARS) break;
    messages.unshift(...pair);
    totalCharacters += pairCharacters;
  }

  return messages;
}

export type ChatHistorySurface = "public_chat" | "managerial_ai" | "ania";

export async function getServerOwnedChatHistory(input: {
  conversationId: string;
  ownerKey: string;
  surface: ChatHistorySurface;
  userId: string | null;
}) {
  try {
    const rows = await db
      .select({
        userMessage: chatHistory.userMessage,
        assistantMessage: chatHistory.assistantMessage,
      })
      .from(chatHistory)
      .where(
        and(
          eq(chatHistory.conversationId, input.conversationId),
          eq(chatHistory.ownerKey, input.ownerKey),
          eq(chatHistory.surface, input.surface),
          input.userId
            ? eq(chatHistory.userId, input.userId)
            : isNull(chatHistory.userId),
          eq(chatHistory.status, "completed"),
          gt(chatHistory.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(chatHistory.createdAt))
      .limit(MAX_MODEL_HISTORY_TURNS);

    return buildServerOwnedChatHistory(rows);
  } catch (error) {
    console.warn("[Chat History] Failed to fetch chat history, returning empty:", error);
    return [];
  }
}

type StartChatHistoryTurnInput = {
  conversationId: string;
  ownerKey: string;
  surface?: ChatHistorySurface;
  userId: string | null;
  userMessage: string;
  provider: string;
  model?: string | null;
};

export async function startChatHistoryTurn(input: StartChatHistoryTurnInput) {
  try {
    try {
      await purgeExpiredChatHistory();
    } catch {
      // ignore purge errors
    }

    const [record] = await db
      .insert(chatHistory)
      .values({
        ...input,
        surface: input.surface ?? "public_chat",
        expiresAt: getChatHistoryExpiry(),
      })
      .returning({ id: chatHistory.id });

    return record?.id ?? null;
  } catch (error) {
    console.warn("[Chat History] Failed to start history turn, proceeding without logging:", error);
    return null;
  }
}

type CompleteChatHistoryTurnInput = {
  assistantMessage: string;
  status?: "completed" | "refused";
  model?: string | null;
  toolNames?: string[];
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs: number;
  finishReason?: string | null;
};

export async function completeChatHistoryTurn(
  id: string | null,
  input: CompleteChatHistoryTurnInput,
) {
  if (!id) return;
  try {
    await db
      .update(chatHistory)
      .set({
        ...input,
        status: input.status ?? "completed",
        updatedAt: new Date(),
      })
      .where(eq(chatHistory.id, id));
  } catch (error) {
    console.warn("[Chat History] Failed to complete history turn:", error);
  }
}

export function getChatHistoryFailureStatus(errorCode: string) {
  if (errorCode === "request_aborted") return "aborted" as const;
  if (errorCode === "response_timeout") return "timed_out" as const;
  return "failed" as const;
}

export async function failChatHistoryTurn(
  id: string | null,
  errorCode: string,
  durationMs: number,
) {
  if (!id) return;
  try {
    await db
      .update(chatHistory)
      .set({
        status: getChatHistoryFailureStatus(errorCode),
        errorCode,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(chatHistory.id, id));
  } catch (error) {
    console.warn("[Chat History] Failed to log failed history turn:", error);
  }
}

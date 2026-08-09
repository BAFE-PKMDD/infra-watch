import { z } from "zod";

export const MAX_CHAT_MESSAGE_CHARS = 4_000;
export const MAX_CHAT_HISTORY_MESSAGES = 20;
export const MAX_CHAT_HISTORY_CHARS = 20_000;
export const MAX_CHAT_REQUEST_BYTES = 64 * 1_024;

export function getChatResponseTimeoutMs(value = process.env.CHAT_RESPONSE_TIMEOUT_MS) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1_000), 55_000) : 55_000;
}

const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_CHARS),
  })
  .strict();

const chatRequestSchema = z
  .object({
    conversationId: z.uuid(),
    message: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_CHARS),
    history: z.array(chatMessageSchema).max(MAX_CHAT_HISTORY_MESSAGES).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const totalHistoryCharacters = value.history.reduce(
      (total, message) => total + message.content.length,
      0,
    );

    if (totalHistoryCharacters > MAX_CHAT_HISTORY_CHARS) {
      context.addIssue({
        code: "custom",
        path: ["history"],
        message: "Conversation history is too large.",
      });
    }
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export function parseChatRequest(input: unknown) {
  return chatRequestSchema.safeParse(input);
}

export async function readBoundedJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10,
  );

  if (Number.isFinite(contentLength) && contentLength > MAX_CHAT_REQUEST_BYTES) {
    throw new Error("Request body is too large.");
  }

  if (!request.body) {
    throw new Error("Request body is required.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_CHAT_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("Request body is too large.");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

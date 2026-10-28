/**
 * An error whose message is already written for the MYDAS user (a failed
 * safety check, an empty result, an unsupported chart shape). Anything else
 * thrown while answering a question is mapped by `describeMydasError` so raw
 * SDK, SQL or driver text never reaches the chat.
 */
export class MydasUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MydasUserError";
  }
}

export const MYDAS_FALLBACK_ERROR = "MYDAS couldn't answer that question. Try rephrasing it.";

function errorChain(error: unknown) {
  const chain: unknown[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    chain.push(current);
    const record = current as { cause?: unknown; lastError?: unknown };
    current = record.lastError ?? record.cause;
  }
  return chain;
}

function readString(value: unknown, key: string) {
  return value && typeof value === "object" && typeof (value as Record<string, unknown>)[key] === "string"
    ? ((value as Record<string, unknown>)[key] as string)
    : "";
}

function readStatus(value: unknown) {
  return value && typeof value === "object" && typeof (value as { statusCode?: unknown }).statusCode === "number"
    ? (value as { statusCode: number }).statusCode
    : undefined;
}

export function describeMydasError(error: unknown): string {
  if (error instanceof MydasUserError) return error.message;

  const chain = errorChain(error);
  const names = chain.map((item) => readString(item, "name"));
  const messages = chain.map((item) => readString(item, "message").toLowerCase());
  const codes = chain.map((item) => readString(item, "code"));
  const statuses = chain.map(readStatus);

  if (names.some((name) => name === "TimeoutError" || name === "AbortError") || messages.some((m) => m.includes("aborted due to timeout"))) {
    return "MYDAS took too long to answer. Try a narrower question, such as one region, program or year.";
  }
  if (codes.includes("57014") || messages.some((m) => m.includes("statement timeout"))) {
    return "That question needs more data than MYDAS can process in time. Narrow it to one region, program or year and try again.";
  }
  if (names.includes("AI_NoObjectGeneratedError") || names.includes("AI_JSONParseError") || names.includes("AI_TypeValidationError")) {
    return "MYDAS couldn't turn that into a chart. Try a more specific question, for example one breakdown at a time.";
  }
  if (statuses.some((status) => status === 429)) {
    return "The AI provider is busy right now. Wait a moment and try again.";
  }
  if (statuses.some((status) => status !== undefined && status >= 500)) {
    return "The AI provider is temporarily unavailable. Try again shortly.";
  }
  return MYDAS_FALLBACK_ERROR;
}

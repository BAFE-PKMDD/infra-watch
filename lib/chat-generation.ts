/**
 * Shared generation settings for ANIA (public chat, admin chat, managerial
 * copilot, executive brief) and MYDAS.
 *
 * Gemini "flash" models spend hidden reasoning tokens that count against
 * `maxOutputTokens`. Without a reasoning cap, a 2,000-token limit can be
 * consumed by reasoning alone and the visible answer stops mid-sentence with
 * finishReason "length". Large inputs make that worse because the model
 * reasons for longer, which also pushes requests past the response timeout.
 */

const DEFAULT_THINKING_BUDGET = 1_024;
const MAX_THINKING_BUDGET = 8_192;

export const ADMIN_CHAT_TIMEOUT_MS = 100_000;
const MAX_ADMIN_CHAT_TIMEOUT_MS = 110_000;

export function getAdminChatResponseTimeoutMs(
  value = process.env.CHAT_ADMIN_RESPONSE_TIMEOUT_MS,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1_000), MAX_ADMIN_CHAT_TIMEOUT_MS)
    : ADMIN_CHAT_TIMEOUT_MS;
}

export function getAiThinkingBudget(value = process.env.AI_THINKING_BUDGET) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), MAX_THINKING_BUDGET)
    : DEFAULT_THINKING_BUDGET;
}

/** Provider options that bound hidden reasoning; undefined when not applicable. */
export function getGenerationProviderOptions(
  provider: string,
  thinkingBudget = getAiThinkingBudget(),
) {
  if (provider !== "google" && provider !== "gemini") return undefined;
  return { google: { thinkingConfig: { thinkingBudget } } };
}

export const TRUNCATED_ANSWER_NOTICE =
  "The answer reached the length limit and was cut off. Send “continue” to get the rest, or ask a narrower question.";

export const FILTERED_ANSWER_NOTICE =
  "The AI provider withheld part of this answer. Try rephrasing the question.";

/** User-facing notice for a finish reason that leaves the answer incomplete. */
export function getIncompleteAnswerNotice(finishReason: string | null | undefined) {
  if (finishReason === "length") return TRUNCATED_ANSWER_NOTICE;
  if (finishReason === "content-filter") return FILTERED_ANSWER_NOTICE;
  return null;
}

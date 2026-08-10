const INTERNAL_OR_INJECTION =
  /(?:\b(?:ignore|disregard|override|bypass)\b.{0,50}\b(?:instructions?|rules?|guardrails?|prompts?)\b|\b(?:reveal|show|list|disclose|describe|give)\b.{0,80}\b(?:hidden|internal|system|developer|private|secret)?\s*(?:prompts?|instructions?|tools?|functions?|parameters?|arguments?|schemas?|apis?|endpoints?|models?|providers?|configuration|environment|source code)\b|\b(?:database|sql|tables?|schemas?)\b.{0,50}\b(?:query|select|access|dump|structure|credentials?)\b|\bselect\s+\*\s+from\b)/i;

const ACCOUNT_OR_PII =
  /(?:\b(?:list|show|give|reveal|export|download|access)\b.{0,60}\b(?:users?|user accounts?|accounts?|emails?|phone numbers?|personal (?:data|information)|citizen pii|pii)\b|\b(?:citizen|user|account)\b.{0,40}\b(?:pii|personal (?:data|information)|emails?|credentials?)\b|\b(?:mga\s+)?account\b.{0,50}\b(?:gumagamit|user|email|personal na impormasyon)\b)/i;

const MUTATION_OR_ADMIN =
  /(?:\b(?:create|update|edit|delete|remove|approve|publish|archive|sync|trigger|mutate)\b.{0,50}\b(?:projects?|records?|database|sync|accounts?)\b|\b(?:audit logs?|secrets?|credentials?|environment variables?)\b)/i;

const EXECUTIVE_BRIEF_REQUEST =
  /\b(?:executive\s+(?:brief|briefing)|management\s+brief)\b/i;

const REFUSAL =
  "I can only provide read-only analysis of the authorized managerial dashboard data. I can’t provide sensitive or internal information or perform administrative actions.";

const EXECUTIVE_BRIEF_REFUSAL =
  "Executive briefs are generated only from the dedicated Executive Brief page.";

export function getManagerialAiPolicyRefusal(
  message: string,
  purpose: "chat" | "executive-brief" = "chat",
): string | null {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (purpose === "chat" && EXECUTIVE_BRIEF_REQUEST.test(normalized)) {
    return EXECUTIVE_BRIEF_REFUSAL;
  }
  if (
    INTERNAL_OR_INJECTION.test(normalized) ||
    ACCOUNT_OR_PII.test(normalized) ||
    MUTATION_OR_ADMIN.test(normalized)
  ) {
    return REFUSAL;
  }
  return null;
}

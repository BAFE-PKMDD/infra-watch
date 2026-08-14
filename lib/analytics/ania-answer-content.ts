function normalizeWhitespace(content: string) {
  return content
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanAniaAnswer(content: string) {
  let cleaned = normalizeWhitespace(content);
  let previous = "";
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = normalizeWhitespace(cleaned
      .replace(/^Data as of[^\n]*(?:\n+|$)/i, "")
      .replace(/^I am ANIA(?:\s*\([^)]*\))?[.!]\s*/i, "")
      .replace(/^Below is[^\n]*(?:\n+|$)/i, ""));
  }
  return normalizeWhitespace(cleaned.replace(/^[ \t]*Below is[^\n]*(?:\n+|$)/gim, ""));
}

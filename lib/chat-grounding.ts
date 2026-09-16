export const KNOWLEDGE_BASE_GROUNDING_INSTRUCTION = `Knowledge-base grounding rules:
- Use knowledge-base results only as reference-document content. Do not represent them as rows from the official infrastructure project database.
- If a result is explicitly described as a synthetic or test record, state prominently that it is not an official infrastructure project. Do not call project-database tools merely to verify, enrich, link, or blend that synthetic example with real project data.
- For questions specifically asking about a test document, QA fixture, manual, policy, guideline, FAQ, or other uploaded reference, answer only from the relevant knowledge-base results unless the user separately asks for official project data.
- Identify the source by its returned document title when useful. Preserve the source's qualification, such as synthetic, test-only, draft, or unofficial.
- Answer in the same language as the user. Give the direct requested value first, then only the supporting fields needed for clarity.
- Do not invent missing fields, project links, official status, or database confirmation. If the reference does not contain the requested fact, say that it is not stated in the available reference.`;

const TEST_REFERENCE_MARKER = /\b(test(?:ing)?|synthetic|qa)\b/i;
const REFERENCE_INTENT_MARKER = /\b(reference|document|embedding|fixture|uploaded)\b/i;

export function getChatActiveToolsForMessage(
  message: string,
): ["searchKnowledgeBase"] | undefined {
  const normalizedMessage = message.replace(/\s+/g, " ").trim();
  if (
    TEST_REFERENCE_MARKER.test(normalizedMessage) &&
    REFERENCE_INTENT_MARKER.test(normalizedMessage)
  ) {
    return ["searchKnowledgeBase"];
  }

  return undefined;
}

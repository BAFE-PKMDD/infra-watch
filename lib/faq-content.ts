export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Single source of truth for the public FAQ - rendered on the /faq page and
 * inlined into ARIA's system prompt so the two never drift out of sync.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "What is InfraWatch?",
    answer:
      "InfraWatch is BAFE's public infrastructure transparency and citizen-feedback platform. It presents available project information, maps, progress details, and moderated community feedback.",
  },
  {
    question: "Why are some projects missing from the map?",
    answer:
      "The map shows only projects with usable, source-backed coordinates. InfraWatch does not invent locations for records with missing or invalid coordinates.",
  },
  {
    question: "Can I submit feedback anonymously?",
    answer:
      "Yes. When you select anonymous submission, your identity is hidden from public users. Authorized personnel may still process the submission for moderation, security, and accountability purposes.",
  },
  {
    question: "Why does submitted feedback not appear immediately?",
    answer:
      "Feedback and evidence may require moderation before public display. This helps protect personal information and prevent unsafe, unlawful, or unrelated content.",
  },
  {
    question: "What evidence can I upload?",
    answer:
      "You may attach supported images or videos relevant to the selected project. Geotagged evidence can include approximate coordinates and device-reported accuracy. Do not upload confidential information or content you do not have permission to share.",
  },
  {
    question: "Are project values guaranteed to be complete?",
    answer:
      "InfraWatch reflects available source records and clearly identifies unavailable information. Approved budget, supplier bid, progress, and location fields may be missing or awaiting source correction.",
  },
  {
    question: "How do I report an issue with a project?",
    answer:
      "Use Report an Issue (in the E-Reports menu, or /report-issue/new). You can search for the related project first, or describe the farm operation and location if you don't know which project it is.",
  },
  {
    question: "How do I give feedback on a project?",
    answer:
      "Open the project's page and use the feedback section, or post general feedback from the Citizen Feed (/citizen-feed). You can attach photos or videos and choose to post anonymously.",
  },
];

export function formatFaqForPrompt(entries: FaqEntry[] = FAQ_ENTRIES): string {
  return entries.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`).join("\n\n");
}

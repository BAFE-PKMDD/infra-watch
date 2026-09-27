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
    question: "Which projects does InfraWatch cover?",
    answer:
      "InfraWatch covers AMEFIP projects under Agricultural Machinery, Equipment and Facilities Support Services and Irrigation Network Services, as recorded in ABEMIS for fiscal years 2021 to 2026. Projects outside that scope are not listed.",
  },
  {
    question: "Where does the project information come from?",
    answer:
      "Project records are synchronized from ABEMIS, the source system of record. InfraWatch does not edit source values. If a project detail looks wrong, report it so the responsible office can review and correct the source record.",
  },
  {
    question: "Why are some projects missing from the map?",
    answer:
      "The map shows only projects with usable, source-backed coordinates. InfraWatch does not invent locations for records with missing or invalid coordinates.",
  },
  {
    question: "Are project values guaranteed to be complete?",
    answer:
      "InfraWatch reflects available source records and clearly identifies unavailable information. Approved budget, supplier bid, progress, and location fields may be missing or awaiting source correction.",
  },
  {
    question: "Which reporting channel should I use?",
    answer:
      "Use the Citizen Feed for a public rating, photo, or observation on a project. Use an Online E-Report for a specific problem that needs a tracked ticket and a moderator response, such as a delay, defect, or safety hazard. Use SMS Grievance if you have no mobile data or internet connection.",
  },
  {
    question: "How do I report an issue with a project?",
    answer:
      "Use Report an Issue (in the E-Reports menu, or /report-issue/new). You can search for the related project first, or describe the farm operation and location if you don't know which project it is. After submitting, you receive a ticket number.",
  },
  {
    question: "Can I report an issue without internet access?",
    answer:
      "Yes. Send an SMS grievance to the official number using the format shown on the SMS instructions page (/report-issue/sms). An automatic reply confirms your report and gives you a ticket number.",
  },
  {
    question: "How do I check the status of my report?",
    answer:
      "Keep the ticket number you receive after submitting. If you were signed in when you reported, you can also follow status updates and moderator responses under My Issues (/my-issues).",
  },
  {
    question: "How do I give feedback on a project?",
    answer:
      "Open the project's page and use the feedback section, or post general feedback from the Citizen Feed (/citizen-feed). You can attach photos or videos and choose to post anonymously.",
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
    question: "Can I rely on ARIA's answers?",
    answer:
      "ARIA is an AI assistant that answers from InfraWatch records you are authorized to view. Its answers are AI-generated and can be incomplete or wrong, so verify them against the project page or dashboard before relying on them or making official decisions.",
  },
  {
    question: "How do I request deletion of my personal data?",
    answer:
      "Follow the steps on the Request Data Deletion page (/data-deletion). Identify the account or submission involved, but never send passwords or unnecessary identification documents. BAFE may verify your identity before changing records.",
  },
  {
    question: "How do I contact BAFE about InfraWatch?",
    answer:
      "Send a message through the Contact Us page (/contact), email bafe@da.gov.ph, or call the hotline at 0949-842-9485 or 0956-234-9888, Monday to Friday, 8 AM to 5 PM. BAFE staff reply to the email address you provide. To report a problem with a specific project, use an E-Report instead so it gets a tracked ticket.",
  },
];

export function formatFaqForPrompt(entries: FaqEntry[] = FAQ_ENTRIES): string {
  return entries.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`).join("\n\n");
}

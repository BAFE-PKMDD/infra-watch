import type { Tour } from "./catalog";
import type { GuideControlAction } from "./guide-control";

export const CITIZEN_OVERVIEW_ID = "citizen-welcome";
export const CITIZEN_PROJECT_ID = "tutorial-citizen-project";
export const CITIZEN_GUIDES = [
  { id: "citizen-feedback", title: "Feedback", description: "Choose a project, write feedback, and review your submission.", path: "/projects" },
  { id: "citizen-report", title: "E-Report", description: "Report a project concern and find where to follow its progress.", path: "/report-issue/new" },
  { id: "citizen-contact", title: "Contact messages", description: "Write a general inquiry using the contact form.", path: "/contact" },
  { id: "citizen-sms", title: "SMS reporting", description: "Review the message format and learn how tracking works.", path: "/citizen-guides/sms" },
] as const;
export type CitizenGuideId = typeof CITIZEN_GUIDES[number]["id"];
export const CITIZEN_TOUR_IDS: readonly string[] = [CITIZEN_OVERVIEW_ID, ...CITIZEN_GUIDES.map(({ id }) => id)];

export const citizenOverview: Tour = {
  id: CITIZEN_OVERVIEW_ID,
  title: "Welcome to INFRA Watch",
  steps: [
    { title: "Explore your citizen portal", description: "Find infrastructure projects, share feedback, report concerns, and follow updates from your account.", target: '[data-citizen-nav="header"]' },
    { title: "Projects and feedback", description: "Browse Projects to check project details, photos, and progress. Open a project’s Feedback tab to share your experience.", target: '[data-citizen-nav="/projects"]' },
    { title: "Citizen Feed", description: "Read published feedback and reports from the community. Your own submissions and their review status are available in My Feedbacks and My Issues.", target: '[data-citizen-nav="/citizen-feed"]' },
    { title: "Report a concern", description: "E-Report helps you identify a project, describe the issue, and provide supporting evidence. The SMS guide explains the alternative reporting format.", target: '[data-citizen-nav="/report-issue"]' },
    { title: "Your account and updates", description: "Use your account menu to open My Feedbacks, My Issues, and notifications. Contact Us is available for general inquiries.", target: '[data-citizen-nav="header"]' },
    { title: "Guidance when you need it", description: "Open Citizen guides for step-by-step help with feedback, E-Report, contact messages, and SMS. The examples do not submit real records.", target: '[data-tour="citizen-guides"]' },
  ],
};

export type CitizenStep = {
  title: string;
  description: string;
  target: string;
  allow?: string;
  // Page steps advance only when the real page or form reveals the next control.
  advance: "page" | "next" | "done";
  minLength?: number;
  readyTarget?: string;
  // Revisit required fields on the same form if they were cleared or skipped.
  prerequisites?: string[];
  action?: GuideControlAction;
  actionTarget?: string;
  requireClick?: boolean;
  fallbackTarget?: string;
};
const step = (title: string, description: string, target: string, advance: CitizenStep["advance"] = "page", allow?: string): CitizenStep => ({ title, description, target, advance, allow });
const formStep = (flow: string, name: string, title: string, description: string, field?: string) => {
  const container = `[data-citizen-step="${flow}-${name}"]`;
  return {
    ...step(title, description, field ? `${container} ${field}` : container, "page", container),
    action: { label: name === "review" ? "Submit example" : flow === "report" && name === "contact" ? "Review" : "Next", behavior: "activate" as const },
    actionTarget: `${container} [data-citizen="form-next"]`,
  };
};

const actionStep = (title: string, description: string, target: string, label: string, allow?: string): CitizenStep => ({
  ...step(title, description, target, "page", allow), action: { label, behavior: "activate" }, requireClick: true,
});

export function citizenStepCanAdvance(current: CitizenStep, clicked: boolean, nextVisible: boolean): boolean {
  return current.advance === "page" && (!current.requireClick || clicked) && nextVisible;
}

export function citizenStepToRevisit(steps: CitizenStep[], index: number, isVisible: (selector: string) => boolean): number {
  const current = steps[index];
  // An unmounted field is a page transition, not a missing answer.
  if (!current?.prerequisites || !isVisible(current.target)) return index;
  for (const selector of current.prerequisites) {
    const previous = steps.findIndex((item, position) => position < index && item.target === selector);
    const field = steps[previous];
    if (field?.readyTarget && isVisible(field.target) && !isVisible(field.readyTarget)) return previous;
  }
  return index;
}

const navigationStep = (title: string, description: string, target: string, label: string): CitizenStep => ({
  ...actionStep(title, description, target, label), fallbackTarget: '[data-citizen-nav="menu"]',
});

export function citizenGuideSteps(id: CitizenGuideId): CitizenStep[] {
  switch (id) {
    case "citizen-feedback": return [
      navigationStep("Open Projects", "Select Projects in the navigation to open the project directory.", '[data-citizen-nav="/projects"]', "Open Projects"),
      actionStep("View project details", "In the project list, select View details beside Example irrigation canal. For real feedback, use the project your experience relates to.", '[data-citizen="project-view-details"]', "View details"),
      actionStep("Open Feedback", "On the project page, select the Feedback tab.", '[data-citizen="project-feedback-tab"]', "Open Feedback"),
      actionStep("Share your feedback", "Select Share feedback to open the project’s feedback form.", '[data-citizen="share-feedback"]', "Share feedback"),
      formStep("feedback", "sentiment", "Describe your experience", "Choose how you feel about the project, or skip this optional choice. Select Next in the form."),
      formStep("feedback", "category", "Choose a category", "Select the category that best fits your feedback, then select Next."),
      formStep("feedback", "details", "Write your feedback", "Enter an example observation about the project. You can add a rating. Attachments are disabled in this guide. Select Next to continue.", "#comment"),
      formStep("feedback", "consent", "Review privacy and consent", "Choose whether to display your name and review the agreement. Select the checkbox, then continue to Review."),
      formStep("feedback", "review", "Check before submitting", "Check the project feedback and select Submit. This guide will show a confirmation without posting anything."),
      step("Feedback guide complete", "For real submissions, open My Feedbacks from your account menu to check review status and any staff response. This example was not submitted.", '[data-citizen="receipt"]', "done"),
    ];
    case "citizen-report": return [
      navigationStep("Open E-Reports", "Select E-Reports in the navigation to open the reporting page.", '[data-citizen-nav="/report-issue"]', "Open E-Reports"),
      actionStep("Open the report form", "Select the online reporting button to open a new E-Report.", '[data-citizen="report-new"]', "Open report form"),
      formStep("report", "farm-operation", "Choose the farm operation", "Choose the farm operation involved in the concern, then select Next."),
      formStep("report", "project-type", "Choose the project type", "Select the type of infrastructure involved, then select Next."),
      formStep("report", "location", "Locate the concern", "Select a region, province, city or municipality, and barangay. Add an example street or landmark, then select Next."),
      formStep("report", "match", "Check matching projects", "Review the example project. Select it if it matches, or continue without a matching project. This step uses example results only."),
      formStep("report", "category", "Choose the concern category", "Select the category that best describes the issue, then select Next."),
      { ...step("Choose an issue type", "Select at least one issue type that describes the concern. Then select Next in this guide.", '[data-citizen="report-issue-types"]', "next"), readyTarget: '[data-citizen="report-issue-types"][data-citizen-ready="true"]' },
      { ...step("Set the date noticed", "Enter the date when the concern was noticed, then select Next in this guide.", '[data-citizen="report-date"]', "next"), readyTarget: '[data-citizen="report-date"][data-citizen-ready="true"]', prerequisites: ['[data-citizen="report-issue-types"]'] },
      { ...formStep("report", "issue-details", "Explain what happened", "Write an example description of at least 20 characters. For example: The canal lining has visible cracks near the entrance. Attachments are disabled here. Select Next when ready.", '[data-citizen="report-description"]'), minLength: 20, prerequisites: ['[data-citizen="report-issue-types"]', '[data-citizen="report-date"]'] },
      formStep("report", "contact", "Review contact and privacy", "The example contact details are filled in. Review anonymity, accuracy, and terms, then select Review. These choices apply only to this example."),
      formStep("report", "review", "Review your report", "Check the details, then select Submit report. No report, evidence, or notification will be sent."),
      step("E-Report guide complete", "Real reports appear in My Issues, where you can check status and staff updates. This example was not submitted.", '[data-citizen="receipt"]', "done"),
    ];
    case "citizen-contact": return [
      actionStep("Open the navigation menu", "Select More to find Contact Us. On a smaller screen, open the navigation menu.", '[data-citizen-nav="more"], [data-citizen-nav="menu"]', "Open menu"),
      navigationStep("Open Contact Us", "Select Contact Us to open the inquiry form.", '[data-citizen-nav="/contact"]', "Open Contact Us"),
      { ...step("Your contact details", "Use the example name and email provided. In a real inquiry, enter an email where staff can reach you.", '[data-citizen="contact-details"]', "next"), action: { label: "Enter contact details", behavior: "focus" } },
      { ...step("Enter a subject", "Write a short subject, such as “Question about project updates”.", '#subject', "next"), minLength: 1, action: { label: "Enter subject", behavior: "focus" } },
      { ...step("Write your inquiry", "Describe your question using at least 10 characters. Use example text for this guide.", '#message', "next"), minLength: 10, action: { label: "Write message", behavior: "focus" } },
      actionStep("Send the example", "Select Send message. The guide shows a confirmation without contacting the office.", '[data-citizen="contact-send"]', "Send example", '[data-citizen="contact-form"]'),
      step("Contact guide complete", "For real inquiries, staff can respond using the email address you provided. Nothing was sent during this guide.", '[data-citizen="receipt"]', "done"),
    ];
    case "citizen-sms": return [
      step("Check service availability", "This page currently labels SMS reporting as a prototype. Its number is an example; do not send a real message to it.", '[data-citizen="sms-notice"]', "next"),
      step("Prepare your message", "Read the required format: project type, sender information, location, and concern. Follow the example to keep your report clear.", '[aria-labelledby="sms-format-title"]', "next"),
      step("Keep your reference", "Review the example conversation and ticket reference. An available SMS service would use that reference to help you track your concern. This guide does not send SMS.", '[data-citizen="sms-conversation"]', "done"),
    ];
  }
}

export function citizenGuideAllowsPath(id: CitizenGuideId, pathname: string): boolean {
  if (id === "citizen-feedback") return pathname === "/projects" || pathname === `/projects/${CITIZEN_PROJECT_ID}`;
  if (id === "citizen-report") return pathname === "/report-issue" || pathname === "/report-issue/new";
  return pathname === CITIZEN_GUIDES.find((guide) => guide.id === id)?.path;
}

/** Tutorial actions are deliberately synchronous and have no persistence callback. */
export function simulateCitizenSubmission(kind: CitizenGuideId, values: { comment?: string; message?: string }) {
  const body = (values.comment ?? values.message ?? "").trim();
  const minimum = kind === "citizen-report" ? 20 : kind === "citizen-contact" ? 10 : 1;
  if (kind === "citizen-sms" || body.length < minimum) throw new Error("Complete the example before submitting.");
  return { simulated: true as const, kind };
}

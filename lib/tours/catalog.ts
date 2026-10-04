import { hasAssignedModeratorScope } from "@/lib/moderator-scope";
import { hasPermission, type statement } from "@/lib/permissions";

export type TourStep = { title: string; description: string; target?: string };
export type FeatureTour = {
  id: string;
  title: string;
  path: string;
  description: string;
  resource: keyof typeof statement;
  action: "view" | "list" | "read";
  roles?: readonly string[];
  steps: TourStep[];
};
export type TourViewer = { role?: string | null; region?: string | null; assignedAgency?: string | null };
export type Tour = { id: string; title: string; steps: TourStep[] };
export const TOUR_VERSION = 1;
export const OVERVIEW_ID = "welcome";
const admins = ["admin", "regional_admin"];
const target = (name: string) => `[data-tour="${name}"]`;
const step = (title: string, description: string, name?: string): TourStep => ({ title, description, target: name ? target(name) : undefined });

export const FEATURE_TOURS: FeatureTour[] = [
  {
    id: "dashboard", title: "Analytics", path: "/dashboard", resource: "analytics", action: "view",
    description: "Monitor project delivery, allocated budgets, schedule status, and regional performance within your authorized scope.",
    steps: [
      step("Check the data date", "Review the last successful sync and data age before using the figures. Refresh reloads the dashboard; it does not start an ABEMIS synchronization.", "dashboard-freshness"),
      step("Choose your project scope", "Filter by program, funding year, region, province, project type, project status, and timeline status. These filters update the measures and charts together.", "dashboard-filters"),
      step("Read the primary measures", "Compare total projects, allocated budget, completion rate, and delayed projects. Allocated budget is the approved budget, not spending. Check coverage before interpreting schedule results.", "dashboard-kpis"),
      step("Prioritize projects for review", "Review the listed projects and their reported progress, dates, and delay duration. Open a project or the full project list for its supporting records.", "dashboard-priority"),
      step("Use the regional map", "Select a region to narrow the dashboard to that location. Missing location or schedule data can limit what can be shown.", "dashboard-map"),
      step("Inspect chart evidence", "Compare delayed projects by region and allocated budgets by project type. Available chart selections open the underlying project records.", "dashboard-charts"),
      step("Review schedule and progress", "Expand this section for schedule health, reported progress, regional comparisons, and funding-year breakdowns. Cannot be assessed means the required evidence is missing.", "dashboard-schedule"),
      step("See the portfolio breakdown", "Expand Where projects stand for project stages, regional totals, and facility types.", "dashboard-portfolio"),
      step("Examine delivery and delays", "Expand this section for procurement, contract duration, contractors, turnover, and other delivery measures. Read each chart's coverage and limitations.", "dashboard-delivery"),
      step("Ask ANIA or open a brief", "When ANIA is enabled, use Ask ANIA for questions about the selected scope and Executive Brief for a written analysis. Verify AI-generated statements against project records.", "dashboard-actions"),
    ],
  },
  {
    id: "executive-brief", title: "Executive Brief", path: "/executive-brief", resource: "analytics", action: "view",
    description: "Prepare a written analysis of the current project scope, with supporting evidence and verification guidance.",
    steps: [
      step("Set the briefing context", "Check the assessment date and project scope, then select Generate brief. You can cancel generation or refresh the data before generating again.", "brief-controls"),
      { title: "Read and verify the analysis", description: "Review the report alongside its data coverage notes. Generated analysis supports review and is not an official decision. A brief appears here after generation.", target: "#ania-executive-brief-report" },
      step("Download or ask a follow-up", "After a brief is generated, the download and Ask ANIA controls become available. Verify figures and recommendations before sharing the report.", "brief-controls"),
    ],
  },
  {
    id: "projects", title: "Projects", path: "/admin-projects", resource: "projects", action: "list",
    description: "Search the read-only AMEFIP and INS project catalog synchronized from ABEMIS.",
    steps: [
      step("Find a project", "Search the catalog and narrow results by program or status. Reset clears the filters and returns to the first page.", "projects-filters"),
      step("Review source records", "Open a project from the results to inspect its details. These records are mirrored from ABEMIS; this catalog does not create or edit source projects.", "projects-table"),
      step("Move through results", "Use pagination to review the remaining matching projects. The result count reflects your current filters.", "projects-pagination"),
    ],
  },
  {
    id: "feedback", title: "Feedbacks", path: "/feedbacks", resource: "feedback", action: "list",
    description: "Review citizen feedback, manage which submissions appear on public project pages, and reply in the feedback conversation.",
    steps: [
      step("Review feedback status", "Check the totals and moderation status before selecting submissions to review.", "feedback-summary"),
      step("Find submissions", "Use the available search and filters to narrow the feedback queue.", "feedback-filters"),
      step("Moderate with context", "Open a submission to review its message and evidence. Use only the moderation and response actions available to your role; these actions can affect public visibility.", "feedback-list"),
    ],
  },
  {
    id: "issues", title: "Reported Issues", path: "/issues", resource: "issues", action: "list",
    description: "Review E-Report submissions, inspect evidence, and track staff responses and resolution.",
    steps: [
      step("Review the issue queue", "Check the summary to understand the volume and status of reported issues.", "issues-summary"),
      step("Find an issue", "Search the issue queue and filter by status to find reports that need attention.", "issues-filters"),
      step("Open the case record", "Select an issue to review the location, linked project, evidence, and response history before accepting, responding, or resolving it.", "issues-list"),
    ],
  },
  {
    id: "messages", title: "Contact Messages", path: "/contact-messages", resource: "contact_messages", action: "list",
    description: "Read messages submitted through Contact Us and track which messages staff have handled.",
    steps: [
      { title: "Filter the inbox", description: "Use the status tabs to find new or previously handled messages. Counts show the number of messages in each group.", target: 'main [aria-label="Filter by status"]' },
      step("Reply and update the status", "Read the sender's message, reply using your own email, then update its status so other staff know it was handled. Selecting an email address opens your email application.", "page-content"),
    ],
  },
  ...(["issues", "feedbacks"] as const).map((kind): FeatureTour => ({
    id: `reports-${kind}`, title: kind === "issues" ? "Issue Reports" : "Feedback Reports", path: `/reports/${kind}`, resource: "reports", action: "view", roles: admins,
    description: `Review ${kind === "issues" ? "issue" : "feedback"} response times, service-level performance, and detailed records.`,
    steps: [
      step("Choose the reporting period", "Set the date range to recalculate this report. Confirm the period before comparing response performance.", "report-dates"),
      step("Read response performance", "Review the response-time summaries and charts. First public response and resolution are different measures; use the labels and underlying records to interpret them.", "report-summary"),
      step("Download the records", "When report data is available, use the download control to export the detailed records for the selected period.", "report-download"),
    ],
  })),
  {
    id: "engagement", title: "Citizen Engagement", path: "/reports/citizen-engagement", resource: "reports", action: "view", roles: admins,
    description: "Review recorded citizen activity, project discovery, and common issues.",
    steps: [
      { title: "Confirm reporting coverage", description: "Check the reporting context and period. Activity counts reflect recorded events, not a census of citizens.", target: '[aria-label="Reporting context"]' },
      { title: "Review daily activity", description: "Compare activity over time and use the accompanying table to inspect daily counts.", target: '[aria-labelledby="daily-activity-heading"]' },
      { title: "Understand project discovery", description: "Review how projects are found and the search-result distribution. Network-region activity is approximate and does not establish a person's location.", target: '[aria-labelledby="project-discovery-heading"]' },
      { title: "Review common issues", description: "Use the recorded issue categories as supporting evidence when planning follow-up.", target: '[aria-labelledby="common-issues-heading"]' },
    ],
  },
  {
    id: "sync", title: "ABEMIS Sync", path: "/sync", resource: "abemis_sync", action: "view", roles: ["admin"],
    description: "Synchronize source project records and inspect synchronization results and failures.",
    steps: [
      step("Check synchronization history", "Review previous runs and their results before starting another synchronization. Failed runs may leave the last successfully synchronized data in place.", "sync-history"),
      step("Start a source synchronization", "Sync Now updates the local project records from ABEMIS. The status refreshes while the job runs. This tour does not start a synchronization.", "sync-start"),
    ],
  },
  {
    id: "quality", title: "Data Quality", path: "/data-quality", resource: "data_quality", action: "view", roles: ["admin"],
    description: "Inspect missing or inconsistent source fields and the coverage of infrastructure records.",
    steps: [
      { title: "Choose a data scope", description: "Use the filters to inspect data quality for a program, year, or region.", target: '[aria-label="Data quality filters"]' },
      step("Inspect coverage and exceptions", "Review missing or inconsistent fields and the affected records. Missing evidence limits what can be assessed; it is not proof of project performance.", "page-content"),
    ],
  },
  {
    id: "audit", title: "Audit Logs", path: "/audit-logs", resource: "audit_logs", action: "view", roles: ["admin"],
    description: "Inspect the recorded trail of system and staff actions.",
    steps: [
      step("Narrow the audit trail", "Use the available event and date filters to investigate a specific activity or period.", "audit-filters"),
      step("Review recorded actions", "Check who performed an action, when it happened, and which record it affected. Open available details for additional context.", "audit-trail"),
    ],
  },
  {
    id: "knowledge", title: "Knowledge Base", path: "/knowledge-base", resource: "knowledge_base", action: "list", roles: ["admin"],
    description: "Manage reference documents and FAQ entries used by ANIA.",
    steps: [
      step("Add or find reference material", "Use the upload and FAQ controls to add reference material, or search and filter the repository. Confirm the source and contents before adding a document.", "knowledge-controls"),
      step("Check document processing", "Review each document's processing status before expecting it to be available to ANIA. Repository actions include inspection, archival, and deletion where available.", "knowledge-repository"),
    ],
  },
  {
    id: "videos", title: "Live Videos", path: "/live-videos", resource: "system_settings", action: "read", roles: admins,
    description: "Manage Facebook and YouTube broadcasts and replays for the public portal.",
    steps: [
      step("Review broadcasts", "Check the video list, active status, and review status before making changes. Open a video to inspect its configuration.", "page-content"),
      step("Publish within your role", "Add or edit a broadcast using the available controls. Approval and publishing actions depend on your role; review the destination and content before publishing.", "videos-table"),
    ],
  },
  {
    id: "settings", title: "Settings", path: "/settings", resource: "system_settings", action: "read", roles: admins,
    description: "Review site-wide automation for E-Report acknowledgment and acceptance.",
    steps: [
      { title: "Review acknowledgment behavior", description: "When automatic acceptance is enabled, new E-Reports move to Under Review and receive the configured acknowledgment. Editing these settings requires administrator permission.", target: '[aria-label="Toggle issue auto-accept"]' },
      { title: "Check the acknowledgment message", description: "Review the text sent to citizens. An administrator must save changes for them to take effect.", target: "#issue-ack-message" },
    ],
  },
  {
    id: "users", title: "User Management", path: "/user-management", resource: "user", action: "list", roles: admins,
    description: "Manage the accounts and permissions available within your role and scope.",
    steps: [
      step("Find an account", "Search users and filter by role or account status. Regional administrators only have access to the accounts and actions allowed by their scope.", "users-filters"),
      step("Review account permissions", "Inspect the account before using an available action. Role changes, account restrictions, and session revocation affect access; confirm the intended person and scope.", "users-list"),
    ],
  },
];

export const DETAIL_TOURS = [
  {
    id: "issue-detail", parent: "issues", path: "/issues/:id", title: "Issue review",
    steps: [
      step("Review the case", "Check the report, location, linked project, and current status before deciding what to do next.", "page-heading"),
      { title: "Inspect submitted evidence", description: "Open available photos, videos, and documents to inspect the report. Missing evidence does not establish whether an issue is valid or resolved.", target: '[aria-labelledby="evidence-heading"]' },
      { title: "Choose one review action", description: "Select the required next step and complete its fields. Check whether your update will be public or staff-only before saving. This guide does not submit a response or change the case status.", target: '[aria-labelledby="next-step-heading"]' },
      step("Read the case history", "Expand Previous updates to review staff responses, internal notes, and status changes before adding another update.", "issue-history"),
    ],
  },
  ...(["new", ":id"] as const).map((suffix) => ({
    id: suffix === "new" ? "video-create" : "video-edit", parent: "videos", path: `/live-videos/${suffix}`,
    title: suffix === "new" ? "Add a video" : "Edit a video",
    steps: [
      step("Configure the broadcast", "Confirm the assigned region, video source, and title. The fields shown depend on the video type and your permissions.", "video-form"),
      { title: "Identify the video", description: "Use a clear title so citizens can identify this broadcast or replay. Check its description and source before saving.", target: 'main #title' },
      step("Review before saving", "Check the full configuration and any approval notice. Save submits your changes; publishing and approval depend on your role. The tour leaves the form unchanged.", "video-form"),
    ],
  })),
] satisfies Array<Tour & { parent: string; path: string }>;

export function availableFeatureTours(viewer: TourViewer): FeatureTour[] {
  if (!["admin", "regional_admin", "moderator"].includes(viewer.role ?? "")) return [];
  return FEATURE_TOURS.filter((tour) =>
    (!tour.roles || tour.roles.includes(viewer.role ?? "")) &&
    hasPermission(viewer.role, tour.resource, tour.action as never) &&
    (tour.resource !== "analytics" || hasAssignedModeratorScope(viewer)),
  );
}

export function pageTour(pathname: string, viewer: TourViewer): Tour | null {
  const available = availableFeatureTours(viewer);
  const segments = pathname.split("/");
  // Match exact route segments; list instructions must never leak into a form.
  const detail = DETAIL_TOURS.find((tour) => {
    const pattern = tour.path.split("/");
    return pattern.length === segments.length && pattern.every((part, index) =>
      part === ":id" ? Boolean(segments[index]) && segments[index] !== "sms-review" : part === segments[index],
    ) && available.some((parent) => parent.id === tour.parent);
  });
  const feature = available.find((tour) => tour.path === pathname);
  if (detail) return { id: detail.id, title: detail.title, steps: [...detail.steps,
    step("Tour complete", "You have finished this guide. Use Take a tour to review these steps again."),
  ] };
  if (!feature) return null;
  return { id: feature.id, title: feature.title, steps: [
    step(feature.title, feature.description, "page-heading"),
    ...feature.steps,
    step("Tour complete", "You have finished this page's tour. Use Take a tour at any time to replay it or review all features."),
  ] };
}

export function availableTourIds(viewer: TourViewer): string[] {
  const ids = availableFeatureTours(viewer).map((tour) => tour.id);
  return [OVERVIEW_ID, ...ids, ...DETAIL_TOURS.filter((tour) => ids.includes(tour.parent)).map((tour) => tour.id)];
}

export function overviewTour(viewer: TourViewer): Tour {
  return {
    id: OVERVIEW_ID, title: "INFRA Watch feature tour", steps: [
      step("Welcome to INFRA Watch", "This tour introduces the tools available to your account. Use Next and Back to move through the features, or Skip tour to continue working. Each page also has its own guide."),
      ...availableFeatureTours(viewer).map((feature) => ({
        title: feature.title, description: feature.description,
        target: `[data-tour-nav="${feature.path}"]`,
      })),
      step("Your public portal", "Open Public Portal to see the citizen-facing site, including public project information, feedback, and issue reporting.", "public-portal"),
      step("Guidance when you need it", `Open Response guides on ${hasAssignedModeratorScope(viewer) ? "the dashboard" : "the Projects page"} for step-by-step assistance with E-Reports, Feedback, SMS Grievances, and Contact Messages. Each guide highlights the actual controls using example data. No messages are sent or real records changed.`, "response-guides"),
    ],
  };
}

import { hasPermission } from "@/lib/permissions";
import type { TourViewer } from "./catalog";

export type TutorialKind = "reply" | "note" | "status" | "publish" | "delete-issue" | "delete-feedback" | "approve-feedback" | "reject-feedback" | "feedback-reply" | "sms-reply" | "contact-reply";
export type TaskTutorial = {
  id: string;
  kind: TutorialKind;
  title: string;
  description: string;
  resource: "issues" | "feedback" | "sms" | "contact_messages";
  action: "respond" | "update" | "delete" | "approve" | "reject";
};

export const TASK_TUTORIALS: TaskTutorial[] = [
  { id: "live-feedback-reply", kind: "feedback-reply", title: "Respond to feedback", description: "Read the feedback, post an example reply, and check the conversation.", resource: "feedback", action: "respond" },
  { id: "live-sms-reply", kind: "sms-reply", title: "Reply to an SMS grievance", description: "Review the message, write a reply, and check the conversation.", resource: "sms", action: "respond" },
  { id: "live-contact-reply", kind: "contact-reply", title: "Handle a contact message", description: "Practice an email reply, then mark the message as resolved.", resource: "contact_messages", action: "update" },
  { id: "live-reply", kind: "reply", title: "Respond to an issue", description: "Open a report, write a reply, send it, and check the history.", resource: "issues", action: "respond" },
  { id: "live-delete-issue", kind: "delete-issue", title: "Delete an issue", description: "Review the record and follow Delete to its confirmation.", resource: "issues", action: "delete" },
  { id: "live-note", kind: "note", title: "Add a staff note", description: "Save a case note that only authorized staff can read.", resource: "issues", action: "respond" },
  { id: "live-status", kind: "status", title: "Change an issue's status", description: "Choose the new status and record the reason for the change.", resource: "issues", action: "update" },
  { id: "live-publish", kind: "publish", title: "Publish a public summary", description: "Write a privacy-reviewed summary and check what becomes public.", resource: "issues", action: "update" },
  { id: "live-approve-feedback", kind: "approve-feedback", title: "Approve feedback", description: "View a submission, add a moderation note, and confirm approval.", resource: "feedback", action: "approve" },
  { id: "live-reject-feedback", kind: "reject-feedback", title: "Reject feedback", description: "Review a submission and confirm that it stays hidden from public pages.", resource: "feedback", action: "reject" },
  { id: "live-delete-feedback", kind: "delete-feedback", title: "Delete feedback", description: "Review the feedback and its attachments before confirming deletion.", resource: "feedback", action: "delete" },
];

export function availableTaskTutorials(viewer: TourViewer, pageId?: string): TaskTutorial[] {
  if (!["admin", "regional_admin", "moderator"].includes(viewer.role ?? "")) return [];
  return TASK_TUTORIALS.filter((tutorial) =>
    hasPermission(viewer.role, tutorial.resource === "sms" ? "issues" : tutorial.resource, tutorial.action as never) &&
    (!pageId || (pageId === "feedback" ? tutorial.resource === "feedback" : ["issues", "issue-detail"].includes(pageId) ? tutorial.resource === "issues" : true)),
  );
}

// Only response workflows appear in the achievement checklist. Legacy IDs remain
// valid so saved progress from earlier tours can still be read.
export function availableResponseLessons(viewer: TourViewer): TaskTutorial[] {
  const available = availableTaskTutorials(viewer);
  return ["live-reply", "live-feedback-reply", "live-sms-reply", "live-contact-reply"]
    .flatMap((id) => available.filter((lesson) => lesson.id === id));
}

export function lessonPath(tutorial: TaskTutorial): string {
  return { issues: "/issues", feedback: "/feedbacks", sms: "/learn/sms-grievances", contact_messages: "/contact-messages" }[tutorial.resource];
}

export function lessonPrefix(tutorial: TaskTutorial): string {
  return { issues: "issue", feedback: "feedback", sms: "sms", contact_messages: "contact" }[tutorial.resource];
}

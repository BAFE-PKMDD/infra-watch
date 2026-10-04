import type { AdminFeedbackItem } from "@/actions/query/feedback.query";
import type { AdminIssueDetail } from "@/components/admin/issues/issue-detail-admin-view";
import type { IssueReviewActionMode, IssueReviewPayload } from "@/components/admin/issues/issue-review-action";
import type { getContactMessages } from "@/actions/query/contact-messages.query";
import type { ContactMessageStatus } from "@/lib/contact-messages";
import type { FeedbackFeedComment } from "@/types/feedback.types";
import type { TutorialKind } from "./tutorials";

export const TUTORIAL_ISSUE_ID = "tutorial-example-report";
export const TUTORIAL_FEEDBACK_ID = "tutorial-example-feedback";
export const TUTORIAL_CONTACT_ID = "tutorial-example-contact";
export const isTutorialRecord = (id: string) => id.startsWith("tutorial-");

export type TutorialSandbox = {
  id: string;
  issue: AdminIssueDetail | null;
  feedback: AdminFeedbackItem | null;
  feedbackComments: FeedbackFeedComment[];
  contact: Awaited<ReturnType<typeof getContactMessages>>["data"][number];
  contactReply: string;
};
export type SandboxAction =
  | { resource: "issues"; recordId: string; action: "delete" }
  | { resource: "issues"; recordId: string; action: IssueReviewActionMode; payload: IssueReviewPayload }
  | { resource: "feedback"; recordId: string; action: "approved" | "rejected" | "delete"; moderationNote?: string }
  | { resource: "feedback"; recordId: string; action: "reply"; body: string }
  | { resource: "contact_messages"; recordId: string; action: "reply"; body: string }
  | { resource: "contact_messages"; recordId: string; action: "status"; status: ContactMessageStatus };

export function createTutorialSandbox(id: string, kind?: TutorialKind): TutorialSandbox {
  const date = new Date().toISOString();
  return {
    id,
    contact: {
      id: TUTORIAL_CONTACT_ID, name: "Tutorial citizen", email: "citizen@example.invalid", subject: "Request for a project update",
      message: "Tutorial example: where can I find the latest update on the irrigation canal inspection?", status: "new", userId: null,
      handledAt: null, handledByName: null, createdAt: new Date(date),
    },
    contactReply: "",
    feedbackComments: [],
    issue: {
      id: TUTORIAL_ISSUE_ID, ticketNumber: "TUTORIAL-001", projectId: null, projectName: "Example irrigation canal",
      category: "Project Quality", issueType: "Canal lining needs inspection",
      issueDescription: "Tutorial example: a section of the irrigation canal lining needs inspection. Please provide an update on the next steps.",
      publicDescription: null, publicApprovedAt: null, publicApprovedBy: null,
      status: "reviewing", rawStatus: "reviewing", priority: "normal", region: "Example region", province: "Example province", city: "Example municipality", barangay: "Example barangay", streetLandmark: "Near the irrigation canal",
      reporterUserId: null, reporterName: "Tutorial reporter", reporterContact: null, reporterEmail: null, isAnonymous: true,
      photoUrls: [], videoUrls: [], documentUrls: [], evidence: [], geoVideoTrack: null, geoVideoUrl: null,
      createdAt: date, updatedAt: date, dateNoticed: date, resolvedAt: null, responses: [], project: null,
    },
    feedback: {
      id: TUTORIAL_FEEDBACK_ID, projectId: "tutorial-project", userId: null, rating: 3,
      comment: "Tutorial example: the irrigation canal is useful, but one section needs inspection. Please check the lining near the access road.",
      category: "quality", sentiment: "negative", issueType: null, media: [], isAnonymous: true, helpfulCount: 0, unhelpfulCount: 0,
      status: kind === "feedback-reply" ? "approved" : "pending", moderatedBy: null, moderatedAt: null, moderationNote: null, createdAt: new Date(date), updatedAt: new Date(date),
      user: { id: "tutorial-citizen", name: "Tutorial citizen", email: "", image: null },
      project: { id: "tutorial-project", abemisId: "tutorial-project", projectCode: "TUTORIAL-001", name: "Example irrigation canal", province: "Example province", municipality: "Example municipality" },
    },
  };
}

export function applySandboxAction(state: TutorialSandbox, action: SandboxAction): TutorialSandbox {
  const date = new Date().toISOString();
  if (action.resource === "contact_messages") {
    if (action.recordId !== state.contact.id) throw new Error("Choose the tutorial contact message to continue.");
    if (action.action === "reply") {
      if (!action.body.trim()) throw new Error("Write an example reply first.");
      return { ...state, contactReply: action.body.trim() };
    }
    if (action.status === "resolved" && !state.contactReply) throw new Error("Practice the email reply before marking this example as resolved.");
    return { ...state, contact: { ...state.contact, status: action.status, handledAt: new Date(date), handledByName: "Tutorial staff" } };
  }
  if (action.resource === "feedback") {
    if (!state.feedback || action.recordId !== state.feedback.id) throw new Error("Choose the tutorial feedback to continue.");
    if (action.action === "reply") {
      if (!action.body.trim()) throw new Error("Write an example reply first.");
      return { ...state, feedbackComments: [...state.feedbackComments, {
        id: `tutorial-feedback-reply-${state.feedbackComments.length + 1}`, feedbackId: action.recordId, userId: "tutorial-staff",
        comment: action.body.trim(), media: [], helpfulCount: 0, unhelpfulCount: 0, createdAt: new Date(date),
        user: { id: "tutorial-staff", name: "Tutorial staff", image: null },
      }] };
    }
    return { ...state, feedback: action.action === "delete" ? null : {
      ...state.feedback, status: action.action, moderationNote: action.moderationNote ?? null,
      moderatedAt: new Date(date), updatedAt: new Date(date), moderatedBy: "tutorial-staff",
    } };
  }
  const issue = state.issue;
  if (!issue || action.recordId !== issue.id) throw new Error("Choose the tutorial report to continue.");
  if (action.action === "delete") return { ...state, issue: null };
  const payload = action.payload;
  const status = payload.newStatus ?? issue.status;
  return { ...state, issue: {
    ...issue, status, rawStatus: status, updatedAt: date,
    publicDescription: payload.publishToPublic ? payload.publicDescription : issue.publicDescription,
    publicApprovedAt: payload.publishToPublic ? date : issue.publicApprovedAt,
    responses: [...issue.responses, {
      id: `tutorial-update-${issue.responses.length + 1}`, message: payload.message || (payload.publishToPublic ? "Tutorial: public summary previewed." : ""),
      statusChange: payload.newStatus ? `${issue.status} -> ${status}` : null, newStatus: payload.newStatus ?? null,
      internalNotes: payload.internalNotes || null, isInternalOnly: payload.isInternalOnly, attachmentUrls: [], createdAt: date,
      responderName: "Tutorial staff", responder: { id: "tutorial-staff", name: "Tutorial staff", role: "admin" },
    }],
  } };
}

// All tutorial mutation branches return before the real request can be called.
// Reserved example IDs also stay blocked after exit, refresh, or stale callbacks.
export async function runTutorialMutation<T>({ sandbox, recordId, simulate, persist }: {
  sandbox: boolean; recordId: string; simulate: () => T; persist: () => Promise<T>;
}): Promise<{ simulated: boolean; data: T }> {
  if (sandbox) return { simulated: true, data: simulate() };
  if (isTutorialRecord(recordId)) throw new Error("This tutorial has ended. Start a new tour to continue.");
  return { simulated: false, data: await persist() };
}

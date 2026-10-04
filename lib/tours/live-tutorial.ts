import type { TutorialActionEvent } from "./events";
import type { TaskTutorial } from "./tutorials";

export type LiveStep = {
  id: string;
  title: string;
  description: string;
  target: string;
  scope?: "row";
  advance: "next" | "action" | "submit" | "done";
  opens?: string;
  container?: string;
  value?: string;
  minLength?: number;
};

const anchor = (name: string) => `[data-tour="${name}"]`;

export function liveTutorialSteps(tutorial: TaskTutorial): LiveStep[] {
  if (tutorial.kind === "feedback-reply") return [
    { id: "record", title: "Read this feedback", description: "Read the example concern. This feedback is already approved, so you can go directly to the response. Select Next to continue.", target: anchor("feedback-row"), scope: "row", advance: "next" },
    { id: "open", title: "Click Respond", description: "Click Respond on the highlighted feedback to open its details and conversation.", target: anchor("feedback-respond"), scope: "row", advance: "action", opens: anchor("feedback-detail") },
    { id: "write", title: "Write a reply to the citizen", description: "Write an example reply in the highlighted field, then select Next. No comment will be posted or sent to the citizen.", target: '[data-tour="feedback-reply-input"]', container: anchor("feedback-detail"), advance: "next", minLength: 1 },
    { id: "save", title: "Post the example reply", description: "Click Post reply to see the response in this example conversation. No comment, attachment, or notification will be sent.", target: anchor("feedback-reply-send"), container: anchor("feedback-detail"), advance: "submit" },
    { id: "result", title: "Review the conversation", description: "Your example reply appears in the conversation. Select Done to close the guide and discard the example data.", target: anchor("feedback-reply-history"), container: anchor("feedback-detail"), advance: "done" },
  ];
  if (tutorial.kind === "sms-reply") return [
    { id: "record", title: "Read this SMS grievance", description: "Review the example concern and its status. The project and routing are already set so you can practice replying.", target: anchor("sms-row"), scope: "row", advance: "next" },
    { id: "open", title: "Open the message", description: "Click Review message. The guide follows you to the SMS case page.", target: anchor("sms-open"), scope: "row", advance: "action", opens: anchor("sms-detail") },
    { id: "action", title: "Use the Reply tab", description: "The Reply tab contains the response field. Select Next to write a reply. This guide focuses on the response workflow.", target: anchor("sms-reply-tab"), advance: "next" },
    { id: "write", title: "Write an SMS reply", description: "Explain the next step to the sender in the highlighted field, then select Next. Use example text; nothing will be sent.", target: "#simulated-response", advance: "next", minLength: 1 },
    { id: "save", title: "Send the example reply", description: "Click Send reply to add it to this example conversation. No SMS is sent, and the example is discarded when you close the guide.", target: anchor("sms-send"), advance: "submit" },
    { id: "result", title: "Review the message history", description: "Open the message history to review the example reply. Select Done to close the guide and discard the example data.", target: anchor("sms-history"), advance: "done" },
  ];
  if (tutorial.kind === "contact-reply") return [
    { id: "record", title: "Read the contact message", description: "Review the sender, subject, and question in this example. Select Next to find the reply link.", target: anchor("contact-row"), scope: "row", advance: "next" },
    { id: "open", title: "Use the sender's email link", description: "Click the highlighted email address. Normally it opens your email app. In this guide, it opens an example reply on this page.", target: anchor("contact-email"), scope: "row", advance: "action", opens: anchor("contact-email-preview") },
    { id: "write", title: "Prepare your reply", description: "Write an example response, then select Next. In normal use, write and send your reply from your own email app.", target: "#tutorial-contact-reply", container: anchor("contact-email-preview"), advance: "next", minLength: 1 },
    { id: "send", title: "Preview the email reply", description: "Click Preview reply to review the example. No email is sent.", target: anchor("contact-send"), container: anchor("contact-email-preview"), advance: "action", opens: anchor("contact-email-sent") },
    { id: "save", title: "Mark the message as resolved", description: "After replying, choose Resolved in Status so other staff know the message has been handled. This change affects only the example.", target: anchor("contact-status"), scope: "row", advance: "submit" },
    { id: "result", title: "Review the updated status", description: "The example now shows Resolved. No email was sent and no real message was updated. Select Done to close the guide.", target: anchor("contact-row"), scope: "row", advance: "done" },
  ];
  const issue = tutorial.resource === "issues";
  const prefix = issue ? "issue" : "feedback";
  const deleting = tutorial.action === "delete";
  const record: LiveStep = {
    id: "record", title: issue ? "Start with this report" : "Review this feedback",
    description: issue ? "Read the concern and status in this example report. It exists only for this tutorial. Select Next to find its action." : "Read this example feedback and its status. It exists only for this tutorial. Select Next to find its actions.",
    target: anchor(`${prefix}-row`), scope: "row", advance: "next",
  };
  if (deleting) return [record, {
    id: "open", title: "Open the delete confirmation", description: "Click Delete on the highlighted record. This opens the actual confirmation so you can review what will be removed.",
    target: anchor(`${prefix}-delete`), scope: "row", advance: "action", opens: anchor(`${prefix}-delete-dialog`),
  }, {
    id: "save", title: "Try the delete confirmation", description: "Click Delete in the confirmation to practice removing this example. No real record or attachment will be deleted. Cancel returns you to the previous step.",
    target: anchor(`${prefix}-delete-confirm`), container: anchor(`${prefix}-delete-dialog`), advance: "submit",
  }, {
    id: "result", title: "Deletion practiced", description: "The example was removed for this tutorial. Your real records are unchanged. Select Done to leave tutorial mode.",
    target: anchor(issue ? "issues-list" : "feedback-list"), advance: "done",
  }];
  if (!issue) {
    const approving = tutorial.kind === "approve-feedback";
    return [record, {
      id: "open", title: "Open the submission", description: "Click View on this feedback to open its details and attachments.",
      target: anchor("feedback-view"), scope: "row", advance: "action", opens: anchor("feedback-detail"),
    }, {
      id: "action", title: approving ? "Choose Approve" : "Choose Reject",
      description: "Review the full submission and attachments. Then click the highlighted action to open the moderation form.",
      target: anchor(approving ? "feedback-approve" : "feedback-reject"), container: anchor("feedback-detail"), advance: "action", opens: anchor("feedback-moderation-dialog"),
    }, {
      id: "write", title: "Add a moderation note", description: "Enter a note in the actual form if you need to record your reasoning. This field is optional. Select Next when ready.",
      target: "#moderation-note", container: anchor("feedback-moderation-dialog"), advance: "next",
    }, {
      id: "save", title: approving ? "Confirm approval" : "Confirm rejection",
      description: approving ? "Click Confirm to practice approving the example. Nothing will be published and no real feedback will change." : "Click Confirm to practice rejecting the example. No real feedback will change.",
      target: anchor("feedback-moderation-confirm"), container: anchor("feedback-moderation-dialog"), advance: "submit",
    }, {
      id: "result", title: approving ? "Approval practiced" : "Rejection practiced", description: "The example shows the new status for this tutorial only. No moderation decision was saved. Select Done to finish.",
      target: anchor("feedback-list"), advance: "done",
    }];
  }
  const fields = {
    reply: { label: "Reply to the citizen", field: "#response-message", title: "Write an example reply", description: "Type a response in the highlighted field. This tutorial will not send it to anyone. Select Next when ready.", save: "Try sending the reply", confirm: "Click Send reply to preview the result in the case history. No message will be sent and nothing will be saved to a real report." },
    note: { label: "Add a staff note", field: "#staff-note", title: "Write an example staff note", description: "Enter an example note in the highlighted field, then select Next. In normal use, staff notes are visible only to authorized staff.", save: "Try saving the note", confirm: "Click Save staff note to see it in the example case history. This note will be discarded when you finish the tutorial." },
    status: { label: "Change case status", field: "#status-note", title: "Explain the example change", description: "Write an example reason for changing the status, then select Next. This explanation is only for the tutorial.", save: "Try updating the status", confirm: "Click Update case status to preview the new status and history. No real case will change." },
    publish: { label: "Publish a public summary", field: "#public-description", title: "Write an example summary", description: "Enter an example summary of 20 to 2,000 characters. In normal use, remove names, contact details, exact addresses, and sensitive information. Select Next when ready.", save: "Try publishing the summary", confirm: "Click Publish reviewed summary to preview the result. Nothing will be published or saved outside this tutorial." },
  };
  const mode = tutorial.kind as keyof typeof fields;
  const field = fields[mode];
  return [record, {
    id: "open", title: "Click Respond", description: "Click the highlighted Respond button. It opens this report's case page, and the guide follows you there.",
    target: anchor("issue-respond"), scope: "row", advance: "action", opens: anchor("issue-detail"),
  }, {
    id: "action", title: "Choose what to do", description: `On the case page, choose “${field.label}” under “What do you need to do?”. Select Next to continue.`,
    target: "#review-action", advance: "next", value: mode,
  }, ...(mode === "status" ? [{
    id: "status", title: "Choose the new status", description: "Select the appropriate new status in the highlighted dropdown, then select Next.",
    target: "#issue-status", advance: "next" as const, minLength: 1,
  }] : []), {
    id: "write", title: field.title, description: field.description, target: field.field, advance: "next", minLength: mode === "publish" ? 20 : 1,
  }, {
    id: "save", title: field.save, description: field.confirm, target: anchor("issue-save"), advance: "submit",
  }, {
    id: "result", title: "Review the example result", description: "Open Previous updates to see the simulated result. Nothing was sent or saved to real records. Select Done to discard the tutorial data.",
    target: anchor("issue-history"), advance: "done",
  }];
}

export function canAdvanceLiveStep(step: LiveStep, value: string, available: boolean): boolean {
  return available && step.advance === "next" &&
    (step.value === undefined || value === step.value) &&
    (step.minLength === undefined || value.trim().length >= step.minLength);
}

export type LiveTutorialState = { index: number; recordId: string | null; pending: boolean; saved: boolean; error: boolean };
export const INITIAL_LIVE_STATE: LiveTutorialState = { index: 0, recordId: null, pending: false, saved: false, error: false };
export type LiveTutorialEvent =
  | { type: "select"; recordId: string; index?: number }
  | { type: "step"; index: number }
  | { type: "reset" }
  | { type: "mutation"; detail: TutorialActionEvent };

export type LiveObservation = {
  rowId?: string | null;
  issueDetailId?: string | null;
  onIssueList: boolean;
  openedRecordId?: string | null;
  containerRecordId?: string | null;
  reviewMode?: string;
};

// Loading pages do not reset the guide. Only observed navigation or controls advance it.
export function reconcileLiveTutorial(state: LiveTutorialState, tutorial: TaskTutorial, observed: LiveObservation): LiveTutorialEvent | null {
  if (state.pending || state.saved) return null;
  const steps = liveTutorialSteps(tutorial);
  const step = steps[state.index];
  const reviewing = (tutorial.resource === "issues" && tutorial.action !== "delete") || tutorial.resource === "sms";
  if (reviewing && observed.issueDetailId && (state.index < 2 || observed.issueDetailId !== state.recordId)) {
    return { type: "select", recordId: observed.issueDetailId, index: 2 };
  }
  if (reviewing && state.index >= 2 && observed.onIssueList && !observed.issueDetailId) return { type: "reset" };
  if (!state.recordId && observed.rowId) return { type: "select", recordId: observed.rowId };
  if (step.opens && state.recordId && observed.openedRecordId === state.recordId) return { type: "step", index: state.index + 1 };
  if (step.container && observed.containerRecordId !== state.recordId) {
    const opener = steps.findIndex((item) => item.opens === step.container);
    if (opener >= 0) return { type: "step", index: opener };
  }
  if (tutorial.resource === "issues" && reviewing && state.index > 2 && observed.reviewMode && observed.reviewMode !== tutorial.kind) return { type: "step", index: 2 };
  return null;
}

export function reduceLiveTutorial(state: LiveTutorialState, event: LiveTutorialEvent, tutorial: TaskTutorial): LiveTutorialState {
  if (event.type === "reset") return state.pending ? state : INITIAL_LIVE_STATE;
  if (event.type === "select") return state.recordId === event.recordId && (event.index === undefined || state.index === event.index) ? state : { ...state, recordId: event.recordId, index: event.index ?? state.index, error: false };
  if (event.type === "step") return state.pending || state.saved || state.index === event.index || event.index < 0 || event.index >= liveTutorialSteps(tutorial).length - 1 ? state : { ...state, index: event.index, error: false };
  const expectedAction = tutorial.action === "delete" ? "delete" : tutorial.kind === "approve-feedback" ? "approved" : tutorial.kind === "reject-feedback" ? "rejected" : tutorial.kind === "sms-reply" || tutorial.kind === "feedback-reply" ? "reply" : tutorial.kind === "contact-reply" ? "resolved" : tutorial.kind;
  if (!event.detail.simulated || event.detail.resource !== tutorial.resource || event.detail.recordId !== state.recordId || event.detail.action !== expectedAction || state.saved) return state;
  const steps = liveTutorialSteps(tutorial);
  return {
    ...state,
    pending: event.detail.outcome === "pending",
    saved: event.detail.outcome === "success",
    error: event.detail.outcome === "error",
    index: steps.findIndex((step) => step.id === (event.detail.outcome === "success" ? "result" : "save")),
  };
}

import type { IssueStatus } from "@/types/issues.types";

export type AdminIssueStatus = IssueStatus;
export type IssueReviewActionMode = "reply" | "note" | "status" | "publish";

export const ISSUE_REVIEW_ACTIONS = {
  reply: {
    label: "Reply to the citizen",
    description: "Send an update that the reporter can read.",
    submitLabel: "Send reply",
    successMessage: "Reply saved",
  },
  note: {
    label: "Add a staff note",
    description: "Record information for authorized staff only.",
    submitLabel: "Save staff note",
    successMessage: "Staff note saved",
  },
  status: {
    label: "Change case status",
    description: "Move the case to its next stage and record why.",
    submitLabel: "Update case status",
    successMessage: "Case status updated",
  },
  publish: {
    label: "Publish a public summary",
    description: "Share a privacy-reviewed summary on the public issue page.",
    submitLabel: "Publish reviewed summary",
    successMessage: "Public summary published",
  },
} satisfies Record<IssueReviewActionMode, {
  label: string;
  description: string;
  submitLabel: string;
  successMessage: string;
}>;

export type IssueReviewActionDraft = {
  mode: IssueReviewActionMode;
  responseMessage: string;
  internalNotes: string;
  status: AdminIssueStatus | "";
  publicDescription: string;
};

export type IssueReviewPayload = {
  message: string;
  internalNotes: string;
  newStatus: AdminIssueStatus | undefined;
  isInternalOnly: boolean;
  publishToPublic: boolean;
  publicDescription: string;
};

export function createIssueReviewDraft(mode: IssueReviewActionMode): IssueReviewActionDraft {
  return {
    mode,
    responseMessage: "",
    internalNotes: "",
    status: "",
    publicDescription: "",
  };
}

export function canSaveIssueReviewAction(draft: IssueReviewActionDraft) {
  if (draft.mode === "reply") return draft.responseMessage.trim().length > 0;
  if (draft.mode === "note") return draft.internalNotes.trim().length > 0;
  if (draft.mode === "status") return Boolean(draft.status) && draft.internalNotes.trim().length > 0;
  return draft.publicDescription.trim().length >= 20;
}

export function buildIssueReviewPayload(draft: IssueReviewActionDraft): IssueReviewPayload {
  if (draft.mode === "reply") {
    return {
      message: draft.responseMessage.trim(),
      internalNotes: "",
      newStatus: undefined,
      isInternalOnly: false,
      publishToPublic: false,
      publicDescription: "",
    };
  }

  if (draft.mode === "note") {
    return {
      message: "",
      internalNotes: draft.internalNotes.trim(),
      newStatus: undefined,
      isInternalOnly: true,
      publishToPublic: false,
      publicDescription: "",
    };
  }

  if (draft.mode === "status") {
    return {
      message: "",
      internalNotes: draft.internalNotes.trim(),
      newStatus: draft.status || undefined,
      isInternalOnly: true,
      publishToPublic: false,
      publicDescription: "",
    };
  }

  const publicDescription = draft.publicDescription.trim();
  return {
    message: "",
    internalNotes: "",
    newStatus: undefined,
    isInternalOnly: false,
    publishToPublic: true,
    publicDescription,
  };
}

export function getIssueReviewActionLabel(mode: IssueReviewActionMode) {
  return ISSUE_REVIEW_ACTIONS[mode].submitLabel;
}

export function getIssueReviewSuccessMessage(mode: IssueReviewActionMode) {
  return ISSUE_REVIEW_ACTIONS[mode].successMessage;
}

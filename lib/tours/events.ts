export const TUTORIAL_ACTION_EVENT = "infra-watch:tutorial-action";

export type TutorialActionEvent = {
  resource: "issues" | "feedback" | "sms" | "contact_messages";
  recordId: string;
  action: "reply" | "note" | "status" | "publish" | "delete" | "approved" | "rejected" | "resolved";
  outcome: "pending" | "success" | "error";
  simulated?: boolean;
};

// Observe existing mutations. The guide never sends requests or performs actions.
export function notifyTutorialAction(detail: TutorialActionEvent) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<TutorialActionEvent>(TUTORIAL_ACTION_EVENT, { detail }));
  }
}

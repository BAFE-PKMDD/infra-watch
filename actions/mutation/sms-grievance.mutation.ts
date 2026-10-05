"use server";

import { sendSMS } from "@/lib/sms";
import { canAccessAdmin, getCurrentUser } from "@/lib/session";
import {
  LiveReviewConflictError,
  loadLiveRecordFromFeed,
  runLiveSmsAction,
  runLiveSmsLink,
  type LiveReviewDeps,
} from "@/lib/sms-grievance/live-review";
import { canUseSmsPrototype } from "@/lib/sms-grievance/policy";
import type { PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import { drizzleSmsReviewStore } from "@/lib/sms-grievance/review-store";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

type SendResult = { success: boolean; error?: string };

// Sends a real acknowledgment SMS for the "Simulate incoming message" prototype tool —
// the only place in the SMS grievance module allowed to actually call the gateway, since
// it's the only case where the phone number is one a staff member typed in themselves to
// test the flow, never a real citizen's number from the live feed or a fixture. Gated the
// same way the review page itself is (admin/moderator/regional_admin, non-production) so
// this can't be reached by crafting a request directly against the server action.
export async function sendSimulatedAcknowledgmentSms(mobile: string, message: string): Promise<SendResult> {
  const canManageIssues = await canAccessAdmin();
  if (!canUseSmsPrototype({ nodeEnv: process.env.NODE_ENV, canManageIssues })) {
    return { success: false, error: "Not authorized to use the SMS grievance prototype." };
  }

  const result = await sendSMS(mobile, message);
  return { success: result.success, error: result.error };
}

export type LiveSmsActionResponse =
  | { success: true; records: SmsMockScenario[]; delivery?: { success: boolean; error?: string } }
  | { success: false; error: string };

const LIVE_ACTION_TYPES: ReadonlySet<PrototypeAction["type"]> = new Set([
  "accept",
  "mark_not_bafe_project",
  "mark_unrelated",
  "mark_duplicate",
  "assign",
  "transition",
  "restrict",
  "simulate_response",
  "add_internal_note",
]);

async function liveReviewContext(): Promise<{ deps: LiveReviewDeps; actor: string } | { error: string }> {
  if (!(await canAccessAdmin())) return { error: "Not authorized to review SMS grievances." };
  const user = await getCurrentUser();
  return {
    actor: user?.id ?? "unknown-staff",
    deps: { store: drizzleSmsReviewStore, send: sendSMS, loadLive: loadLiveRecordFromFeed },
  };
}

function toFailure(error: unknown): LiveSmsActionResponse {
  if (error instanceof LiveReviewConflictError) return { success: false, error: error.message };
  console.error("[SMS Grievance] Live review action failed:", error instanceof Error ? error.message : error);
  return { success: false, error: error instanceof Error ? error.message : "That change could not be saved." };
}

// A review decision on a real message from the SMS line. Saves the decision to the
// database and, for the actions that reply to the sender (tagging a project, marking it not
// a BAFE project, a manual reply), sends that reply as a real SMS.
export async function applyLiveSmsAction(messageId: string, action: PrototypeAction): Promise<LiveSmsActionResponse> {
  const context = await liveReviewContext();
  if ("error" in context) return { success: false, error: context.error };
  if (!LIVE_ACTION_TYPES.has(action?.type)) return { success: false, error: "That action is not supported." };

  try {
    return { success: true, ...(await runLiveSmsAction(context.deps, messageId, action, context.actor)) };
  } catch (error) {
    return toFailure(error);
  }
}

export async function linkLiveSmsToThread(messageId: string, threadId: string): Promise<LiveSmsActionResponse> {
  const context = await liveReviewContext();
  if ("error" in context) return { success: false, error: context.error };

  try {
    return { success: true, ...(await runLiveSmsLink(context.deps, messageId, threadId, context.actor)) };
  } catch (error) {
    return toFailure(error);
  }
}

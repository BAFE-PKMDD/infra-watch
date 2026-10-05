"use server";

import { generateMydasWidget, type MydasReply } from "@/lib/mydas/generate-widget";
import { checkChatRateLimits } from "@/lib/chat-rate-limit";
import { requireAdmin } from "@/lib/session";

type AskMydasResult =
  | { success: true; data: MydasReply }
  | { success: false; error: string };

export async function askMydas(question: string): Promise<AskMydasResult> {
  try {
    const user = await requireAdmin();

    const trimmed = question.trim();
    if (!trimmed) {
      return { success: false, error: "Ask a question first." };
    }
    if (trimmed.length > 500) {
      return { success: false, error: "That question is too long — keep it under 500 characters." };
    }

    const rateLimit = await checkChatRateLimits(`mydas:user:${user.id}`);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.globalLimitReached
          ? "MYDAS has reached its shared daily usage limit. Try again tomorrow."
          : "You're asking too quickly — wait a moment and try again.",
      };
    }

    const reply = await generateMydasWidget(trimmed);
    return { success: true, data: reply };
  } catch (error) {
    console.error("[MYDAS] Failed to generate widget:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "MYDAS couldn't answer that question.",
    };
  }
}

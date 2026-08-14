import { and, eq, or, type SQL } from "drizzle-orm";

import { chatHistory } from "@/lib/db/schema";

export type ChatHistoryViewer = {
  role?: string | null;
  userId: string;
};

export function getChatHistoryVisibilityCondition(
  viewer: ChatHistoryViewer,
): SQL | undefined {
  if (viewer.role === "admin") return undefined;

  return or(
    eq(chatHistory.surface, "public_chat"),
    and(
      eq(chatHistory.surface, "managerial_ai"),
      eq(chatHistory.userId, viewer.userId),
    ),
  );
}

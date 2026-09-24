"use server";

import { getSession } from "@/lib/session";
import {
  savePost,
  unsavePost,
  getUserSavedPostIds,
  subscribeToPost,
  unsubscribeFromPost,
  getUserSubscribedPostIds,
} from "@/lib/post-interactions";

export async function toggleSavePostAction(input: {
  postId: string;
  postType: "feedback" | "issue";
  saved: boolean;
}): Promise<{ success: boolean; saved: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return {
        success: true,
        saved: input.saved,
        message: input.saved ? "Saved locally" : "Removed locally",
      };
    }

    if (input.saved) {
      await savePost(session.user.id, input.postId, input.postType);
    } else {
      await unsavePost(session.user.id, input.postId);
    }

    return {
      success: true,
      saved: input.saved,
      message: input.saved ? "Post saved to your bookmarks" : "Post removed from your bookmarks",
    };
  } catch (error) {
    console.error("Error in toggleSavePostAction:", error);
    return {
      success: false,
      saved: !input.saved,
      message: "Failed to update saved post status",
    };
  }
}

export async function togglePostSubscriptionAction(input: {
  postId: string;
  postType: "feedback" | "issue";
  enabled: boolean;
}): Promise<{ success: boolean; enabled: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return {
        success: true,
        enabled: input.enabled,
        message: input.enabled ? "Subscribed locally" : "Unsubscribed locally",
      };
    }

    if (input.enabled) {
      await subscribeToPost(session.user.id, session.user.email, input.postId, input.postType);
    } else {
      await unsubscribeFromPost(session.user.id, input.postId);
    }

    return {
      success: true,
      enabled: input.enabled,
      message: input.enabled
        ? "Notifications turned on. You will receive in-app and email updates on new comments."
        : "Notifications turned off.",
    };
  } catch (error) {
    console.error("Error in togglePostSubscriptionAction:", error);
    return {
      success: false,
      enabled: !input.enabled,
      message: "Failed to update notification subscription",
    };
  }
}

export async function getUserPostInteractionsAction(): Promise<{
  savedPostIds: string[];
  subscribedPostIds: string[];
}> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { savedPostIds: [], subscribedPostIds: [] };
    }

    const [savedPostIds, subscribedPostIds] = await Promise.all([
      getUserSavedPostIds(session.user.id),
      getUserSubscribedPostIds(session.user.id),
    ]);

    return { savedPostIds, subscribedPostIds };
  } catch (error) {
    console.error("Error fetching user post interactions:", error);
    return { savedPostIds: [], subscribedPostIds: [] };
  }
}

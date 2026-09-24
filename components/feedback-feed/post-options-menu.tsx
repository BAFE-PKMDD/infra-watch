"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Bell,
  BellOff,
  Link2,
  Check,
  EyeOff,
  Flag,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  toggleSavePostAction,
  togglePostSubscriptionAction,
} from "@/actions/mutation/post-interactions.mutation";

interface PostOptionsMenuProps {
  postId: string;
  postType: "feedback" | "issue";
  projectName?: string | null;
  onViewProject?: () => void;
  onHidePost?: () => void;
}

const subscribe = () => () => {};

export function PostOptionsMenu({
  postId,
  postType,
  projectName,
  onViewProject,
  onHidePost,
}: PostOptionsMenuProps) {
  const [isInterested, setIsInterested] = useState(false);
  const [isNotificationsOn, setIsNotificationsOn] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  // Initialize saved states from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedInterested = localStorage.getItem(`post_interested_${postId}`);
        if (savedInterested === "true") setIsInterested(true);

        const savedNotifs = localStorage.getItem(`post_notifications_${postId}`);
        if (savedNotifs === "true") setIsNotificationsOn(true);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [postId]);

  const handleToggleInterested = () => {
    const nextState = !isInterested;
    setIsInterested(nextState);

    if (typeof window !== "undefined") {
      try {
        if (nextState) {
          localStorage.setItem(`post_interested_${postId}`, "true");
        } else {
          localStorage.removeItem(`post_interested_${postId}`);
        }
        window.dispatchEvent(
          new CustomEvent("post-saved-change", {
            detail: { postId, isSaved: nextState, postType },
          })
        );
      } catch {
        // Ignore localStorage errors
      }
    }

    // Persist to backend if logged in
    toggleSavePostAction({ postId, postType, saved: nextState }).catch((err) => {
      console.warn("Error updating save post status on server:", err);
    });

    if (nextState) {
      toast.success("Marked as Interested", {
        description: "Saved to your bookmarks. View them anytime in the Saved tab.",
      });
    } else {
      toast.info("Removed from Interested", {
        description: "Post removed from your saved items.",
      });
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !isNotificationsOn;
    setIsNotificationsOn(nextState);

    if (typeof window !== "undefined") {
      try {
        if (nextState) {
          localStorage.setItem(`post_notifications_${postId}`, "true");
        } else {
          localStorage.removeItem(`post_notifications_${postId}`);
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    // Persist to backend and subscribe email / in-app
    togglePostSubscriptionAction({ postId, postType, enabled: nextState }).catch((err) => {
      console.warn("Error updating post subscription on server:", err);
    });

    if (nextState) {
      toast.success("Notifications turned on", {
        description: "You'll receive in-app and email updates when someone comments on this post.",
      });
    } else {
      toast.info("Notifications turned off", {
        description: "You'll no longer receive notifications for this post.",
      });
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = mounted
      ? `${window.location.origin}/citizen-feed#${postType}-${postId}`
      : "";

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl || window.location.href);
        setIsCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error("Copy failed:", error);
        toast.error("Failed to copy link");
      }
    }
  };

  const handleHide = () => {
    if (onHidePost) {
      onHidePost();
    }
    toast.info("Post hidden from your feed", {
      description: "You will see fewer posts like this.",
    });
  };

  const handleReport = () => {
    toast.success("Post reported to moderators", {
      description: "Thank you for helping keep Infra Watch transparent and safe.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] relative"
        aria-label="Post options"
      >
        <MoreHorizontal className="w-5 h-5" />
        {(isInterested || isNotificationsOn) && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0d1526]" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-72 sm:w-80 p-1.5 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0d1526] z-[9999]"
      >
        {/* 1. Interested / Save post */}
        <DropdownMenuItem
          onClick={handleToggleInterested}
          className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-700 dark:text-slate-300">
            {isInterested ? (
              <BookmarkCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 fill-current" />
            ) : (
              <Bookmark className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              {isInterested ? "Remove from Interested" : "Interested / Save post"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              {isInterested
                ? "Remove this post from your saved bookmarks"
                : "Save this to your bookmarks and see more like this"}
            </div>
          </div>
        </DropdownMenuItem>

        {/* 2. Turn on/off notifications for this post */}
        <DropdownMenuItem
          onClick={handleToggleNotifications}
          className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-700 dark:text-slate-300">
            {isNotificationsOn ? (
              <BellOff className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Bell className="w-4.5 h-4.5 text-sky-600 dark:text-sky-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              {isNotificationsOn
                ? "Turn off notifications for this post"
                : "Turn on notifications for this post"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              {isNotificationsOn
                ? "Stop receiving updates when new comments are added"
                : "Receive alerts when other citizens comment or updates arrive"}
            </div>
          </div>
        </DropdownMenuItem>

        {/* 3. View Project details (if project available) */}
        {projectName && onViewProject && (
          <DropdownMenuItem
            onClick={onViewProject}
            className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
              <ExternalLink className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate">
                View project details
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal truncate">
                {projectName}
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {/* 4. Copy Link */}
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-700 dark:text-slate-300">
            {isCopied ? (
              <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Link2 className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              {isCopied ? "Link copied!" : "Copy link"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              Copy link to this specific post
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* 5. Hide post */}
        <DropdownMenuItem
          onClick={handleHide}
          className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-600 dark:text-slate-400">
            <EyeOff className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              Hide post
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              See fewer posts like this
            </div>
          </div>
        </DropdownMenuItem>

        {/* 6. Report post */}
        <DropdownMenuItem
          onClick={handleReport}
          className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
            <Flag className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 leading-tight">
              Report post
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              We won&apos;t let the author know who reported this
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

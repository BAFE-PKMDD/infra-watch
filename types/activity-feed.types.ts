import type { FeedbackFeedItem } from "./feedback.types";

// ─── Activity Feed Types ──────────────────────────────

export type ActivityFeedItemType = "feedback" | "issue";

/** Issue status values */
export type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

/** Issue type values */
export type IssueType =
  | "damage"
  | "stopped"
  | "safety"
  | "flooding"
  | "blocked"
  | "quality"
  | "other";

/** Feedback item in the activity feed — wraps FeedbackFeedItem with type discriminator */
export interface FeedbackActivityItem extends FeedbackFeedItem {
  type: "feedback";
}

/** Issue item in the activity feed */
export interface IssueActivityItem {
  type: "issue";
  id: string;
  issueType: string;
  issueDescription: string;
  status: IssueStatus;
  // Location
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  // Reporter
  reporterName: string;
  isAnonymous: boolean;
  // Evidence thumbnails
  photoUrls: string[];
  videoUrls: string[];
  // Counts
  responseCount: number;
  // Recent responses (admin replies)
  recentResponses: {
    id: string;
    message: string;
    createdAt: Date | string;
    responderName: string;
    attachmentUrls: string[];
  }[];
  // Timestamps
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
  // Optional project
  project: {
    id: string;
    name: string;
  } | null;
}

/** Discriminated union of all feed item types */
export type ActivityFeedItem = FeedbackActivityItem | IssueActivityItem;

/** Filter type for the activity feed */
export type ActivityFeedFilter = "all" | "feedback" | "issue";

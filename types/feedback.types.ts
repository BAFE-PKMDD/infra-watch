/**
 * Feedback-related type definitions
 */

export type FeedbackCategory = "quality" | "progress" | "concerns" | "general";

export interface FeedbackMedia {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

/**
 * CommentMedia is identical to FeedbackMedia
 * Using type alias for semantic clarity
 */
export type CommentMedia = FeedbackMedia;

export interface Feedback {
  id: string;
  projectId: string; // source_id
  userId?: string | null; // Nullable for anonymous feedback

  // Feedback content
  rating?: number | null; // 1-5 stars
  comment: string;
  category: FeedbackCategory;
  media?: FeedbackMedia[]; // Images/videos
  isAnonymous: boolean;

  // Engagement
  helpfulCount: number;
  unhelpfulCount: number;

  // Moderation
  status: string; // "pending", "approved", "rejected"
  moderatedBy?: string | null;
  moderatedAt?: Date | null;
  moderationNote?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackWithUser extends Feedback {
  user?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
}

export interface FeedbackSubmission {
  projectId: string;
  rating?: number;
  comment: string;
  category: FeedbackCategory;
  isAnonymous: boolean;
  media?: FeedbackMedia[];
}

export interface FeedbackFilters {
  category?: FeedbackCategory;
  rating?: number;
  sortBy?: "newest" | "oldest" | "highest-rated" | "most-helpful";
}

export interface FeedbackFeedComment {
  id: string;
  feedbackId: string;
  userId: string;
  comment: string;
  media?: CommentMedia[];
  helpfulCount: number;
  unhelpfulCount: number;
  createdAt: Date | string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface FeedbackFeedItem {
  id: string;
  projectId: string;
  userId?: string | null;
  rating?: number | null;
  comment: string;
  category: string;
  media?: FeedbackMedia[];
  isAnonymous: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  commentCount: number;
  createdAt: Date | string;
  user?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    sourceProjectId: string;
    province?: string | null;
    municipality?: string | null;
  } | null;
  recentComments: FeedbackFeedComment[];
}

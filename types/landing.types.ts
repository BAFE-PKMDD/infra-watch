/**
 * Landing page-related type definitions
 */

export interface LandingPageStats {
  totalFunded: number;
  totalAllocated: number;
  totalCompleted: number;
  totalOngoing: number;
  totalLength: number;
  publishedFeedbackCount: number;
  totalIssuesCount: number;
  totalPhotos: number;
  totalUsers: number;
}

export interface LandingPageData {
  stats: LandingPageStats | null;
  error: Error | null;
}

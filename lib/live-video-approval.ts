import { normalizeVideoRegion } from "@/lib/live-video-region";

type VideoAdmin = { id: string; role?: string | null; region?: string | null };
type VideoRequest = { createdBy: string; region: string | null; approvalStatus: string };

export function canReviewLiveVideos(user: Pick<VideoAdmin, "role" | "region">) {
  if (user.role === "admin" && !user.region?.trim()) return true;
  return (user.role === "admin" || user.role === "regional_admin") && normalizeVideoRegion(user.region) === "NCR";
}

export function assertVideoRequestAccess(user: VideoAdmin, video: VideoRequest) {
  if (canReviewLiveVideos(user)) return;
  if ((user.role !== "admin" && user.role !== "regional_admin") || video.createdBy !== user.id) {
    throw new Error("You can only manage your own video requests.");
  }
}

export function assertVideoReviewer(user: Pick<VideoAdmin, "role" | "region">) {
  if (!canReviewLiveVideos(user)) throw new Error("Only an NCR administrator can approve or publish videos.");
}

export function assertVideoApproved(video: Pick<VideoRequest, "approvalStatus">) {
  if (video.approvalStatus !== "approved") throw new Error("This video must be approved by an NCR administrator before publication.");
}

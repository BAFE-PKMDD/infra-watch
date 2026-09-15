import type { LiveVideo } from "@/lib/db/schema";

export type PublicLiveVideo = Pick<
  LiveVideo,
  | "id"
  | "title"
  | "description"
  | "videoType"
  | "facebookVideoUrl"
  | "isActive"
  | "isLive"
  | "publishedAt"
  | "expiresAt"
  | "createdAt"
  | "updatedAt"
>;

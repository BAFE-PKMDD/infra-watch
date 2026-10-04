ALTER TABLE "live_videos" ALTER COLUMN "facebook_video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "auto_acknowledged_at" timestamp;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "video_type" text DEFAULT 'facebook_live' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "video_path" text;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "thumbnail_path" text;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "duration" integer;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
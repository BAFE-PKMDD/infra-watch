ALTER TABLE "live_videos" ALTER COLUMN "facebook_video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "auto_acknowledged_at" timestamp;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "video_type" text DEFAULT 'facebook_live' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "video_path" text;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "thumbnail_path" text;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;
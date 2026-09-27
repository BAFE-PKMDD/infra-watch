ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "approval_status" text NOT NULL DEFAULT 'approved';
--> statement-breakpoint
ALTER TABLE "live_videos" ALTER COLUMN "approval_status" SET DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "reviewed_by" text;
--> statement-breakpoint
ALTER TABLE "live_videos" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;

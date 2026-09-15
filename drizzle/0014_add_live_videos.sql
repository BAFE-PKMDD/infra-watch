CREATE TABLE "live_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"video_type" text DEFAULT 'facebook_live' NOT NULL,
	"facebook_video_url" text,
	"video_path" text,
	"thumbnail_path" text,
	"duration" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "live_videos_active_schedule_idx" ON "live_videos" USING btree ("is_active","published_at","expires_at");--> statement-breakpoint
CREATE INDEX "live_videos_created_at_idx" ON "live_videos" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "live_videos_single_live_uidx" ON "live_videos" USING btree ("is_live") WHERE "live_videos"."is_live" = true;

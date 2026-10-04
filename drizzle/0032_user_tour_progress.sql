CREATE TABLE "user_tour_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"automatic" boolean DEFAULT true NOT NULL,
	"seen" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

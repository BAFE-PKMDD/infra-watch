CREATE TABLE IF NOT EXISTS "sms_grievance_reviews" (
	"message_id" text PRIMARY KEY NOT NULL,
	"record" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_grievance_reviews_updated_at_idx" ON "sms_grievance_reviews" USING btree ("updated_at");
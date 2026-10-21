CREATE TABLE "account_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"sms" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"requested_by" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"progress" jsonb DEFAULT '{"processed":0,"total":0,"message":"Queued"}'::jsonb NOT NULL,
	"result" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"responder_id" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'sending' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"comment" text NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"unhelpful_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"auto_rejected" boolean DEFAULT false NOT NULL,
	"rejection_reason" text,
	"moderated_by" text,
	"moderated_at" timestamp,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_commodity_overrides" (
	"project_id" text PRIMARY KEY NOT NULL,
	"commodities" jsonb NOT NULL,
	"source_commodities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"region" text NOT NULL,
	"program" text NOT NULL,
	"funded_projects" integer,
	"completed_projects" integer,
	"ongoing_projects" integer,
	"not_yet_started_projects" integer,
	"suspended_projects" integer,
	"allocated_amount" numeric(18, 2),
	"length_completed" numeric(14, 3),
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"as_of" date NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"path" text NOT NULL,
	"upload_id" text,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"part_size" integer NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_sessions_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "contact_responses" ADD CONSTRAINT "contact_responses_message_id_contact_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_comments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published' NOT NULL,
 ADD COLUMN IF NOT EXISTS "auto_rejected" boolean DEFAULT false NOT NULL,
 ADD COLUMN IF NOT EXISTS "rejection_reason" text,
 ADD COLUMN IF NOT EXISTS "moderated_by" text,
 ADD COLUMN IF NOT EXISTS "moderated_at" timestamp,
 ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'feedback_comments'::regclass AND contype = 'f' AND confrelid = 'feedback'::regclass) THEN
  ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "project_commodity_overrides" ADD CONSTRAINT "project_commodity_overrides_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "background_jobs_claim_idx" ON "background_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "background_jobs_active_dedupe_uidx" ON "background_jobs" USING btree ("dedupe_key") WHERE "background_jobs"."status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "contact_responses_message_idx" ON "contact_responses" USING btree ("message_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_comments_feedback_id_idx" ON "feedback_comments" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "feedback_comments_status_idx" ON "feedback_comments" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "regional_statistics_region_year_program_uidx" ON "regional_statistics" USING btree ("region","year","program");--> statement-breakpoint
CREATE INDEX "upload_sessions_owner_idx" ON "upload_sessions" USING btree ("user_id","created_at");

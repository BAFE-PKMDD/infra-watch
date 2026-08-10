CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"action" text NOT NULL,
	"user_id" text,
	"user_name" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text,
	"rating" integer,
	"comment" text,
	"category" text,
	"media" jsonb DEFAULT '[]'::jsonb,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderated_by" text,
	"moderated_at" timestamp,
	"moderation_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"responder_id" text NOT NULL,
	"responder_name" text NOT NULL,
	"responder_role" text,
	"message" text NOT NULL,
	"status_change" text,
	"new_status" text,
	"internal_notes" text,
	"is_internal_only" boolean DEFAULT false NOT NULL,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"project_id" text,
	"reporter_user_id" text,
	"reporter_name" text,
	"reporter_contact" text,
	"reporter_email" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"description" text NOT NULL,
	"region" text,
	"province" text,
	"municipality" text,
	"barangay" text,
	"landmark" text,
	"latitude" real,
	"longitude" real,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"geo_video_track" jsonb,
	"geo_video_url" text,
	"assigned_to" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issues_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abemis_raw_id" text,
	"abemis_id" text NOT NULL,
	"project_code" text,
	"name" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"province" text,
	"municipality" text,
	"barangay" text,
	"latitude" real,
	"longitude" real,
	"budget" numeric(14, 2),
	"abc" real,
	"contract_amount" numeric(14, 2),
	"calendar_days" integer,
	"physical_progress" integer DEFAULT 0 NOT NULL,
	"financial_progress" integer DEFAULT 0 NOT NULL,
	"implementing_agency" text,
	"contractor_name" text,
	"start_date" timestamp,
	"target_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"operating_unit" text,
	"banner_program" text,
	"year_funded" text,
	"project_type" text NOT NULL,
	"region" text,
	"district" text,
	"stage" text,
	"program" text DEFAULT 'AMEFIP' NOT NULL,
	"author" text,
	"quantity" text,
	"quantity_unit" text,
	"beneficiary" text,
	"prexc_program" text,
	"sub_program" text,
	"indicator_level1" text,
	"indicator_level3" text,
	"recipient_type" text,
	"budget_process" text,
	"date_turn_over" text,
	"road_class" text,
	"road_type" text,
	"road_used" text,
	"implementation_type" text,
	"proposed_length" text,
	"post_geotagged_length" text,
	"procurement_mode" text,
	"psgc_code" text,
	"metadata" jsonb,
	"commodities" jsonb DEFAULT '[]'::jsonb,
	"geom" geometry(Point, 4326),
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_abemis_raw_id_unique" UNIQUE("abemis_raw_id"),
	CONSTRAINT "projects_abemis_id_unique" UNIQUE("abemis_id")
);
--> statement-breakpoint
CREATE TABLE "psgc_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geo_code" text NOT NULL,
	"geo_code1" text,
	"region_name" text NOT NULL,
	"reg_shortname" text,
	"province_name" text,
	"municipality_name" text,
	"barangay_name" text,
	"region_code" text,
	"province_code" text,
	"municipality_code" text,
	"barangay_code" text,
	"phcode_reg" text,
	"phcode_prov" text,
	"phcode_mun" text,
	"phcode_bgy" text,
	"reg_code1" text,
	"prov_code1" text,
	"mun_code1" text,
	"bgy_code1" text,
	"dist_code" text,
	"district" text,
	"city_class" text,
	"latitude" real,
	"longitude" real,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "psgc_locations_geo_code_unique" UNIQUE("geo_code")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_type" text NOT NULL,
	"resource" text DEFAULT 'project' NOT NULL,
	"status" text NOT NULL,
	"records_added" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"total_processed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"error_details" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"triggered_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'citizen',
	"region" text,
	"assigned_agency" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_responses" ADD CONSTRAINT "issue_responses_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_table_name_idx" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_project_id_idx" ON "feedback" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issue_responses_issue_id_idx" ON "issue_responses" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_responses_responder_id_idx" ON "issue_responses" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "issues_ticket_number_idx" ON "issues" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "issues_project_id_idx" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_abemis_id_idx" ON "projects" USING btree ("abemis_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_region_idx" ON "projects" USING btree ("region");--> statement-breakpoint
CREATE INDEX "projects_province_idx" ON "projects" USING btree ("province");--> statement-breakpoint
CREATE INDEX "projects_year_funded_idx" ON "projects" USING btree ("year_funded");
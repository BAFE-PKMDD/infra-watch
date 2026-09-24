CREATE TABLE "submission_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"user_id" text,
	"name" text,
	"age" integer,
	"gender" text,
	"referral_source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "farm_operation" text;--> statement-breakpoint
CREATE INDEX "submission_surveys_source_type_idx" ON "submission_surveys" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "submission_surveys_referral_source_idx" ON "submission_surveys" USING btree ("referral_source");--> statement-breakpoint
CREATE INDEX "submission_surveys_created_at_idx" ON "submission_surveys" USING btree ("created_at");
ALTER TABLE "submission_surveys" ALTER COLUMN "referral_source" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submission_surveys" ADD COLUMN "respondent_type" text;--> statement-breakpoint
ALTER TABLE "submission_surveys" ADD COLUMN "skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "submission_surveys_user_id_idx" ON "submission_surveys" USING btree ("user_id");
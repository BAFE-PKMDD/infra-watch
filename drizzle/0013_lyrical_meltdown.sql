ALTER TABLE "issues" ADD COLUMN "public_description" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "public_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "public_approved_by" text;
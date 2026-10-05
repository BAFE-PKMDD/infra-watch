CREATE TABLE IF NOT EXISTS "mydas_dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Untitled Dashboard' NOT NULL,
	"pages" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mydas_dashboards_created_by_idx" ON "mydas_dashboards" USING btree ("created_by");
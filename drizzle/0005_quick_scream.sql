CREATE TABLE "project_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"sync_log_id" uuid NOT NULL,
	"capture_date" date NOT NULL,
	"captured_at" timestamp NOT NULL,
	"physical_progress" integer NOT NULL,
	"financial_progress" integer,
	"budget" numeric(14, 2),
	"abc" real,
	"status" text NOT NULL,
	"target_completion_date" timestamp,
	"source_last_synced_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD CONSTRAINT "project_metric_snapshots_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD CONSTRAINT "project_metric_snapshots_sync_log_id_sync_logs_id_fk" FOREIGN KEY ("sync_log_id") REFERENCES "public"."sync_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_metric_snapshots_project_sync_day_uidx" ON "project_metric_snapshots" USING btree ("project_id","sync_log_id","capture_date");--> statement-breakpoint
CREATE INDEX "project_metric_snapshots_project_capture_date_idx" ON "project_metric_snapshots" USING btree ("project_id","capture_date");--> statement-breakpoint
CREATE INDEX "project_metric_snapshots_status_capture_date_idx" ON "project_metric_snapshots" USING btree ("status","capture_date");
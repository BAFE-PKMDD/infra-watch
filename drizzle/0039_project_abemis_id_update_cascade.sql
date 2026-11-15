ALTER TABLE "articles" DROP CONSTRAINT "articles_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "project_commodity_overrides" DROP CONSTRAINT "project_commodity_overrides_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "project_data_corrections" DROP CONSTRAINT "project_data_corrections_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" DROP CONSTRAINT "project_metric_snapshots_project_id_projects_abemis_id_fk";
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_commodity_overrides" ADD CONSTRAINT "project_commodity_overrides_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_data_corrections" ADD CONSTRAINT "project_data_corrections_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD CONSTRAINT "project_metric_snapshots_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE cascade ON UPDATE cascade;
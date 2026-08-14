CREATE TABLE "project_data_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"field" text NOT NULL,
	"source_value" jsonb,
	"corrected_value" jsonb NOT NULL,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_data_corrections" ADD CONSTRAINT "project_data_corrections_project_id_projects_abemis_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("abemis_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_data_corrections_project_field_uidx" ON "project_data_corrections" USING btree ("project_id","field");--> statement-breakpoint
CREATE INDEX "project_data_corrections_project_id_idx" ON "project_data_corrections" USING btree ("project_id");
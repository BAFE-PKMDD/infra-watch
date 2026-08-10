DROP INDEX "project_metric_snapshots_project_sync_day_uidx";--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD COLUMN "program" text;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD COLUMN "year_funded" text;--> statement-breakpoint
ALTER TABLE "project_metric_snapshots" ADD COLUMN "project_type" text;--> statement-breakpoint
UPDATE "project_metric_snapshots" AS "snapshot"
SET
  "program" = "project"."program",
  "region" = "project"."region",
  "province" = "project"."province",
  "year_funded" = "project"."year_funded",
  "project_type" = "project"."project_type"
FROM "projects" AS "project"
WHERE "project"."abemis_id" = "snapshot"."project_id";--> statement-breakpoint
DELETE FROM "project_metric_snapshots" AS "older"
USING "project_metric_snapshots" AS "newer"
WHERE "older"."project_id" = "newer"."project_id"
  AND "older"."capture_date" = "newer"."capture_date"
  AND (
    "older"."captured_at" < "newer"."captured_at"
    OR (
      "older"."captured_at" = "newer"."captured_at"
      AND "older"."id" < "newer"."id"
    )
  );--> statement-breakpoint
CREATE UNIQUE INDEX "project_metric_snapshots_project_day_uidx" ON "project_metric_snapshots" USING btree ("project_id","capture_date");
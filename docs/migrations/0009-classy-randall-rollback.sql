-- Schema rollback for drizzle/0009_classy_randall.sql
--
-- IMPORTANT: 0009 consolidates duplicate (project_id, capture_date) rows by
-- retaining the latest captured_at/id row. Those discarded duplicates cannot
-- be recreated by SQL after the fact. Take and verify a database backup before
-- applying 0009 if retaining redundant intra-day rows is required.
--
-- This script restores the pre-0009 schema contract only. Run it manually in a
-- transaction after stopping snapshot writers.

BEGIN;

DROP INDEX IF EXISTS "project_metric_snapshots_project_day_uidx";

CREATE UNIQUE INDEX "project_metric_snapshots_project_sync_day_uidx"
  ON "project_metric_snapshots" USING btree
  ("project_id", "sync_log_id", "capture_date");

ALTER TABLE "project_metric_snapshots"
  DROP COLUMN IF EXISTS "program",
  DROP COLUMN IF EXISTS "region",
  DROP COLUMN IF EXISTS "province",
  DROP COLUMN IF EXISTS "year_funded",
  DROP COLUMN IF EXISTS "project_type";

COMMIT;

-- Standalone, idempotent migration for deployments that predate geo-video evidence.
-- This repository currently has no Drizzle migration baseline, so apply this SQL
-- separately before deploying code that selects these columns.

begin;

alter table "issues"
  add column if not exists "geo_video_track" jsonb;

alter table "issues"
  add column if not exists "geo_video_url" text;

commit;

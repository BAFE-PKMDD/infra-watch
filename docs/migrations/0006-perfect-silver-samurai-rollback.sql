-- Manual schema rollback for drizzle/0006_perfect_silver_samurai.sql.
-- Apply only after taking a database backup. This restores the former
-- floating-point column type; numeric cent precision cannot be guaranteed
-- after converting back to IEEE-754 real values.
ALTER TABLE "projects"
  ALTER COLUMN "abc" SET DATA TYPE real USING "abc"::real;
ALTER TABLE "project_metric_snapshots"
  ALTER COLUMN "abc" SET DATA TYPE real USING "abc"::real;

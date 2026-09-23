CREATE TABLE "analytics_daily_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_date" date NOT NULL,
	"metric_key" text NOT NULL,
	"dimension_key" text DEFAULT 'all' NOT NULL,
	"dimension_value" text DEFAULT 'all' NOT NULL,
	"resource_type" text DEFAULT 'all' NOT NULL,
	"resource_id" text DEFAULT 'all' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"route_template" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"entry_surface" text NOT NULL,
	"result_count_band" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_aggregates_key_uidx" ON "analytics_daily_aggregates" USING btree ("aggregate_date","metric_key","dimension_key","dimension_value","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "analytics_daily_aggregates_date_metric_idx" ON "analytics_daily_aggregates" USING btree ("aggregate_date","metric_key");--> statement-breakpoint
CREATE INDEX "analytics_events_occurred_at_idx" ON "analytics_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_event_occurred_at_idx" ON "analytics_events" USING btree ("event_name","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_resource_occurred_at_idx" ON "analytics_events" USING btree ("resource_type","resource_id","occurred_at");
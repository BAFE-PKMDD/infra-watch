ALTER TABLE "feedback" ADD COLUMN "sla_gentle_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "sla_urgent_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "sla_breach_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "sla_gentle_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "sla_urgent_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "sla_breach_notified_at" timestamp;
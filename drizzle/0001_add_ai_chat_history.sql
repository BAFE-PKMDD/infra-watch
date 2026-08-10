CREATE TABLE "ai_chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" text,
	"user_message" text NOT NULL,
	"assistant_message" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"tool_names" jsonb DEFAULT '[]'::jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"duration_ms" integer,
	"finish_reason" text,
	"error_code" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_chat_history_conversation_id_idx" ON "ai_chat_history" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_chat_history_user_id_idx" ON "ai_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_chat_history_status_idx" ON "ai_chat_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_chat_history_created_at_idx" ON "ai_chat_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_chat_history_expires_at_idx" ON "ai_chat_history" USING btree ("expires_at");
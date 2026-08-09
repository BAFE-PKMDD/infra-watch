ALTER TABLE "ai_chat_history" ADD COLUMN "owner_key" text;--> statement-breakpoint
UPDATE "ai_chat_history"
SET "owner_key" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "owner_key" IS NULL;--> statement-breakpoint
ALTER TABLE "ai_chat_history" ALTER COLUMN "owner_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "ai_chat_history_owner_conversation_idx" ON "ai_chat_history" USING btree ("owner_key","conversation_id");

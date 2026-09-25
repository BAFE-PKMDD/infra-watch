ALTER TABLE "feedback" ADD COLUMN "sentiment" text;--> statement-breakpoint
CREATE INDEX "feedback_sentiment_idx" ON "feedback" USING btree ("sentiment");
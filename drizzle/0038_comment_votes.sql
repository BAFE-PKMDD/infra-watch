CREATE TABLE "feedback_comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"vote_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_comment_votes" ADD CONSTRAINT "feedback_comment_votes_comment_id_feedback_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."feedback_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_comment_votes_user_comment_uidx" ON "feedback_comment_votes" USING btree ("user_id","comment_id");
CREATE TABLE IF NOT EXISTS "kb_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb,
	"token_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kb_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"file_type" text NOT NULL,
	"file_name" text,
	"file_path" text,
	"file_size" integer,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"faq_question" text,
	"faq_answer" text,
	"content_preview" text,
	"error_message" text,
	"uploaded_by" text NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"archived_at" timestamp,
	"archived_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kb_documents" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "kb_documents" ADD COLUMN IF NOT EXISTS "archived_by" text;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_chunks_document_id_kb_documents_id_fk'
  ) THEN
    ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_document_id_kb_documents_id_fk"
      FOREIGN KEY ("document_id") REFERENCES "public"."kb_documents"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_chunks_document_id_idx" ON "kb_chunks" USING btree ("document_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kb_chunks_document_chunk_uidx" ON "kb_chunks" USING btree ("document_id","chunk_index");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_documents_status_idx" ON "kb_documents" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_documents_category_idx" ON "kb_documents" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_documents_archived_at_idx" ON "kb_documents" USING btree ("archived_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_documents_created_at_idx" ON "kb_documents" USING btree ("created_at");

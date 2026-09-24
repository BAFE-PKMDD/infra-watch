ALTER TABLE "kb_documents" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX "kb_documents_visibility_idx" ON "kb_documents" USING btree ("visibility");
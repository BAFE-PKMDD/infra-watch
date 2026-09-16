const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS kb_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        category text NOT NULL,
        file_type text NOT NULL,
        file_name text,
        file_path text,
        file_size integer,
        chunk_count integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending',
        faq_question text,
        faq_answer text,
        content_preview text,
        error_message text,
        uploaded_by text NOT NULL,
        uploaded_by_name text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS kb_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
        chunk_index integer NOT NULL,
        content text NOT NULL,
        embedding jsonb,
        token_count integer,
        created_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (document_id, chunk_index)
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS kb_documents_status_idx ON kb_documents(status);`;
    await sql`CREATE INDEX IF NOT EXISTS kb_documents_category_idx ON kb_documents(category);`;
    await sql`CREATE INDEX IF NOT EXISTS kb_documents_created_at_idx ON kb_documents(created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS kb_chunks_document_id_idx ON kb_chunks(document_id);`;

    console.log('Knowledge Base tables created successfully!');
  } catch (err) {
    console.error('Failed to create tables:', err);
  } finally {
    process.exit(0);
  }
}

run();

const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const docs = await sql`SELECT title, status, error_message FROM kb_documents ORDER BY created_at DESC LIMIT 5`;
    console.log(docs);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();

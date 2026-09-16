const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    const docs = await sql`SELECT id FROM kb_documents WHERE status = 'indexing'`;
    console.log(`Found ${docs.length} stuck documents.`);
    
    for (const doc of docs) {
      console.log(`Triggering reindex for ${doc.id}...`);
      try {
        const res = await fetch(`http://localhost:3101/api/knowledge-base/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id })
        });
        const data = await res.json();
        console.log(`Result for ${doc.id}:`, data);
      } catch (err) {
        console.error(`Failed to trigger ${doc.id}:`, err);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();

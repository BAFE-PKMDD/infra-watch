const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    const docs = await sql`SELECT id FROM kb_documents WHERE title = 'WHY WE NEED INFRAWATCH' LIMIT 1`;
    if (docs.length === 0) return console.log('not found');
    const doc = docs[0];
    
    console.log(`Triggering process for ${doc.id}...`);
    const res = await fetch(`http://localhost:3101/api/knowledge-base/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id })
    });
    const data = await res.json();
    console.log(`Result:`, data);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();

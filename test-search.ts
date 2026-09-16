import { searchKnowledgeBase } from './lib/kb-search';
import { db } from './lib/db';
import { kbDocuments } from './lib/db/schema';
import 'dotenv/config';

async function run() {
  try {
    console.log('Searching for "INFRAWATCH"...');
    const results = await searchKnowledgeBase('INFRAWATCH');
    console.log('Results:', results);
    
    console.log('\nChecking all documents in DB:');
    const docs = await db.select().from(kbDocuments);
    for (const doc of docs) {
      console.log(`- ${doc.title} (${doc.status})`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
run();

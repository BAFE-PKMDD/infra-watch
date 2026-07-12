const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Dropping feedback...');
    await sql`DROP TABLE IF EXISTS "feedback" CASCADE`;
    console.log('Dropping issues...');
    await sql`DROP TABLE IF EXISTS "issues" CASCADE`;
    console.log('Dropping projects...');
    await sql`DROP TABLE IF EXISTS "projects" CASCADE`;
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();

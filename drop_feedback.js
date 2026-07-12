const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`DROP TABLE IF EXISTS feedback CASCADE`;
    await sql`DROP TABLE IF EXISTS issues CASCADE`;
    console.log('Successfully dropped feedback and issues tables!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

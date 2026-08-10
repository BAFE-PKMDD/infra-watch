const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log('PostGIS enabled successfully!');
  } catch (err) {
    console.error('Failed to enable PostGIS:', err);
  } finally {
    process.exit(0);
  }
}

run();

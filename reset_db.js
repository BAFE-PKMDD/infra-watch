const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Dropping schema public...');
    await sql`DROP SCHEMA public CASCADE`;
    console.log('Creating schema public...');
    await sql`CREATE SCHEMA public`;
    console.log('Re-enabling PostGIS...');
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();

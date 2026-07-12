const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);
sql`TRUNCATE TABLE projects CASCADE`.then(() => {
  console.log('Truncated!');
  process.exit(0);
}).catch(console.error);

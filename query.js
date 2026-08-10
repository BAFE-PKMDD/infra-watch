const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await sql`SELECT id, abemis_id, abemis_raw_id, project_code, name FROM projects WHERE abemis_id = '2024-R7-BOH-INFRA-NLP-SMF-00055' OR project_code = '2024-R7-BOH-INFRA-NLP-SMF-00055'`;
    console.log("Query Results:", res);
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();

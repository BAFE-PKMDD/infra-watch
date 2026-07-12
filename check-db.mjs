import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await sql`SELECT metadata FROM projects WHERE abemis_id = '2024-R10-LDN-INFRA-NLP-GMF-00070' OR project_code = '2024-R10-LDN-INFRA-NLP-GMF-00070' LIMIT 1`;
    if (res.length > 0) {
      console.log('POW Relation:', JSON.stringify(res[0].metadata.powRelation, null, 2));
      console.log('Procurement Relation:', JSON.stringify(res[0].metadata.procurementRelation, null, 2));
      console.log('Keys:', Object.keys(res[0].metadata));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

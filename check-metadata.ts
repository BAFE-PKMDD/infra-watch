import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/infrawatch'
});

async function run() {
  try {
    const res = await pool.query(`SELECT metadata FROM projects WHERE abemis_id = '2024-R10-LDN-INFRA-NLP-GMF-00070' OR project_code = '2024-R10-LDN-INFRA-NLP-GMF-00070' LIMIT 1`);
    if (res.rows.length > 0) {
      console.log('POW Relation Length:', res.rows[0].metadata?.powRelation?.length);
      console.log('Procurement Relation Length:', res.rows[0].metadata?.procurementRelation?.length);
      console.log('Metadata keys:', Object.keys(res.rows[0].metadata));
    } else {
      console.log('Project not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    pool.end();
  }
}

run();

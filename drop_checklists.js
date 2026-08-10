const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`DROP TABLE IF EXISTS project_checklist_items CASCADE`;
    await sql`DROP TABLE IF EXISTS project_checklists CASCADE`;
    await sql`DROP TABLE IF EXISTS checklist_template_items CASCADE`;
    await sql`DROP TABLE IF EXISTS checklist_phases CASCADE`;
    await sql`DROP TABLE IF EXISTS checklist_templates CASCADE`;
    console.log('Successfully dropped checklist tables!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

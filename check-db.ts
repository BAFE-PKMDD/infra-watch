import { db } from './db';
import { projects } from './db/schema';
import { eq, or } from 'drizzle-orm';

async function run() {
  const result = await db.select({ metadata: projects.metadata }).from(projects).where(or(eq(projects.abemisId, '2024-R10-LDN-INFRA-NLP-GMF-00070'), eq(projects.projectCode, '2024-R10-LDN-INFRA-NLP-GMF-00070'))).limit(1);
  if (result.length > 0) {
    const meta = result[0].metadata as any;
    console.log('POW Relation keys:', meta.powRelation ? Object.keys(meta.powRelation[0] || {}) : 'null');
    console.log('POW Relation data:', JSON.stringify(meta.powRelation, null, 2));
    console.log('Procurement data:', JSON.stringify(meta.procurementRelation, null, 2));
  } else {
    console.log('Project not found');
  }
  process.exit(0);
}

run();

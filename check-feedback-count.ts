import { db } from './lib/db';
import { feedback } from './lib/db/schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';

async function run() {
  const total = await db.select({ count: sql<number>`count(*)` }).from(feedback);
  const approved = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(eq(feedback.status, 'approved'));
  const approvedWithComment = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(and(eq(feedback.status, 'approved'), isNotNull(feedback.comment), sql`length(trim(${feedback.comment})) > 0`));
  console.log('total feedback rows:', total[0]?.count);
  console.log('approved rows:', approved[0]?.count);
  console.log('approved rows with non-empty comment:', approvedWithComment[0]?.count);
  process.exit(0);
}

run();

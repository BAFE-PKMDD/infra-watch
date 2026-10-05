import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { smsGrievanceReviews } from "@/lib/db/schema";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

export type StoredSmsReview = { record: SmsMockScenario; version: number };

// The persistence surface the live review flow needs. Kept as an interface so the flow in
// live-review.ts can be tested against an in-memory store without a database.
export interface SmsReviewStore {
  get(messageId: string): Promise<StoredSmsReview | null>;
  getMany(messageIds: string[]): Promise<Map<string, StoredSmsReview>>;
  /** Inserts the first review row for a message. False if one already exists. */
  create(record: SmsMockScenario, updatedBy: string): Promise<boolean>;
  /** Writes only if the stored version still matches. False means someone else wrote first. */
  update(record: SmsMockScenario, expectedVersion: number, updatedBy: string): Promise<boolean>;
}

export const drizzleSmsReviewStore: SmsReviewStore = {
  async get(messageId) {
    const [row] = await db.select().from(smsGrievanceReviews).where(eq(smsGrievanceReviews.messageId, messageId)).limit(1);
    return row ? { record: row.record, version: row.version } : null;
  },

  async getMany(messageIds) {
    if (messageIds.length === 0) return new Map();
    const rows = await db.select().from(smsGrievanceReviews).where(inArray(smsGrievanceReviews.messageId, messageIds));
    return new Map(rows.map((row) => [row.messageId, { record: row.record, version: row.version }]));
  },

  async create(record, updatedBy) {
    const inserted = await db
      .insert(smsGrievanceReviews)
      .values({ messageId: record.id, record, version: 1, updatedBy })
      .onConflictDoNothing()
      .returning({ messageId: smsGrievanceReviews.messageId });
    return inserted.length > 0;
  },

  async update(record, expectedVersion, updatedBy) {
    const updated = await db
      .update(smsGrievanceReviews)
      .set({ record, version: sql`${smsGrievanceReviews.version} + 1`, updatedBy, updatedAt: new Date() })
      .where(and(eq(smsGrievanceReviews.messageId, record.id), eq(smsGrievanceReviews.version, expectedVersion)))
      .returning({ messageId: smsGrievanceReviews.messageId });
    return updated.length > 0;
  },
};

// In-memory implementation with the same optimistic-version semantics, for tests.
export function createMemorySmsReviewStore(): SmsReviewStore & { rows: Map<string, StoredSmsReview> } {
  const rows = new Map<string, StoredSmsReview>();
  return {
    rows,
    async get(messageId) {
      return rows.get(messageId) ?? null;
    },
    async getMany(messageIds) {
      return new Map(messageIds.flatMap((id) => (rows.has(id) ? [[id, rows.get(id)!] as const] : [])));
    },
    async create(record) {
      if (rows.has(record.id)) return false;
      rows.set(record.id, { record, version: 1 });
      return true;
    },
    async update(record, expectedVersion) {
      const current = rows.get(record.id);
      if (!current || current.version !== expectedVersion) return false;
      rows.set(record.id, { record, version: expectedVersion + 1 });
      return true;
    },
  };
}

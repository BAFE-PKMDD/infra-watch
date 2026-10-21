"use server";

import { count, desc, eq, inArray } from "drizzle-orm";

import { user as authUser } from "@/auth-schema";
import { isContactMessageStatus, type ContactMessageStatus } from "@/lib/contact-messages";
import { db } from "@/lib/db";
import { contactMessages, contactResponses } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { requireAuth } from "@/lib/session";

const PAGE_SIZE = 25;

export async function getContactMessages(filters: { status?: string; page?: number } = {}) {
  const user = await requireAuth();
  requirePermission(user.role, "contact_messages", "list");

  const status: ContactMessageStatus | null = isContactMessageStatus(filters.status) ? filters.status : null;
  const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? (filters.page as number) : 1;
  const where = status ? eq(contactMessages.status, status) : undefined;

  const [rows, [{ total }], statusCounts] = await Promise.all([
    db
      .select({
        id: contactMessages.id,
        name: contactMessages.name,
        email: contactMessages.email,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        userId: contactMessages.userId,
        handledAt: contactMessages.handledAt,
        handledByName: authUser.name,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .leftJoin(authUser, eq(authUser.id, contactMessages.handledBy))
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(contactMessages).where(where),
    db.select({ status: contactMessages.status, total: count() }).from(contactMessages).groupBy(contactMessages.status),
  ]);

  const counts: Record<ContactMessageStatus, number> = { new: 0, in_progress: 0, resolved: 0 };
  const responses = rows.length ? await db.select({ id: contactResponses.id, messageId: contactResponses.messageId, body: contactResponses.body, status: contactResponses.status, sentAt: contactResponses.sentAt, createdAt: contactResponses.createdAt, responderName: authUser.name }).from(contactResponses).leftJoin(authUser, eq(authUser.id, contactResponses.responderId)).where(inArray(contactResponses.messageId, rows.map(row => row.id))).orderBy(desc(contactResponses.createdAt)) : [];
  for (const row of statusCounts) {
    if (isContactMessageStatus(row.status)) counts[row.status] = row.total;
  }

  return {
    data: rows.map(row => ({ ...row, responses: responses.filter(response => response.messageId === row.id) })),
    status,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts,
  };
}

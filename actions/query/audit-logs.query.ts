"use server";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { ensureAuditLogsTable } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import type { AuditAction } from "@/types/audit.types";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

const ACTIONS = new Set<AuditAction>(["CREATE", "UPDATE", "DELETE"]);
const EVENT_GROUPS = {
  security: ["auth_attempts"],
  uploads: ["upload_attempts"],
  records: ["user", "feedback", "issues", "issue_responses"],
  sync: ["sync_logs"],
} as const;
const SOURCES = new Set([
  "auth_attempts",
  "upload_attempts",
  "user",
  "feedback",
  "issues",
  "issue_responses",
  "sync_logs",
]);
const CATEGORIES = new Set([
  "login_failed",
  "invalid_mime",
  "invalid_signature",
  "invalid_extension",
  "nsfw_content",
  "size_limit",
  "invalid_request",
]);

export type AuditLogFilters = {
  page?: number;
  limit?: number;
  source?: string;
  tableName?: string;
  group?: string;
  action?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  try {
    await requireAuditLogAccess();
    await ensureAuditLogsTable();

    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 25), 1), 100);
    const offset = (page - 1) * limit;
    const conditions = [];
    const action = ACTIONS.has(filters.action as AuditAction) ? filters.action as AuditAction : null;
    const source = normalizeSource(filters.source ?? filters.tableName);
    const category = normalizeCategory(filters.category);
    const groupSources = getGroupSources(filters.group);
    const fromDate = parseDate(filters.fromDate);
    const toDate = parseDate(filters.toDate, true);

    if (source) {
      conditions.push(eq(auditLogs.tableName, source));
    } else if (groupSources) {
      conditions.push(inArray(auditLogs.tableName, groupSources));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (category) {
      if (category === "login_failed") {
        conditions.push(eq(auditLogs.tableName, "auth_attempts"));
      } else {
        conditions.push(sql`${auditLogs.newValues}->>'category' = ${category}`);
      }
    }

    if (fromDate) {
      conditions.push(gte(auditLogs.createdAt, fromDate));
    }

    if (toDate) {
      conditions.push(lte(auditLogs.createdAt, toDate));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(auditLogs.tableName, pattern),
          ilike(auditLogs.recordId, pattern),
          ilike(auditLogs.userName, pattern),
          ilike(auditLogs.notes, pattern),
          sql`${auditLogs.newValues}::text ilike ${pattern}`,
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          tableName: auditLogs.tableName,
          recordId: auditLogs.recordId,
          action: auditLogs.action,
          userId: auditLogs.userId,
          userName: auditLogs.userName,
          oldValues: auditLogs.oldValues,
          newValues: auditLogs.newValues,
          changedFields: auditLogs.changedFields,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          notes: auditLogs.notes,
          createdAt: auditLogs.createdAt,
          eventName: sql<string | null>`${auditLogs.newValues}->>'event'`,
          eventCategory: sql<string | null>`${auditLogs.newValues}->>'category'`,
          mimeType: sql<string | null>`${auditLogs.newValues}->>'mimeType'`,
          fileName: sql<string | null>`${auditLogs.newValues}->>'fileName'`,
          relatedUserName: authUser.name,
          relatedUserEmail: authUser.email,
        })
        .from(auditLogs)
        .leftJoin(authUser, eq(authUser.id, auditLogs.userId))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        userName: row.userName || row.relatedUserName || row.relatedUserEmail || null,
        eventGroup: getEventGroup(row.tableName),
        displayTitle: getDisplayTitle(row.tableName, row.eventName, row.eventCategory, row.notes),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
    console.error("Failed to fetch audit logs", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch audit logs",
      data: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      status,
    };
  }
}

export async function getAuditLogStats() {
  try {
    await requireAuditLogAccess();
    await ensureAuditLogsTable();

    const [stats] = await db
      .select({
        totalLogs: sql<number>`count(*)::int`,
        totalTables: sql<number>`count(distinct ${auditLogs.tableName})::int`,
        totalUsers: sql<number>`count(distinct ${auditLogs.userId})::int`,
        recentActions: sql<number>`count(*) filter (where ${auditLogs.createdAt} > now() - interval '24 hours')::int`,
        failedLogins: sql<number>`count(*) filter (where ${auditLogs.tableName} = 'auth_attempts')::int`,
        blockedUploads: sql<number>`count(*) filter (where ${auditLogs.tableName} = 'upload_attempts')::int`,
        nsfwBlocks: sql<number>`count(*) filter (where ${auditLogs.tableName} = 'upload_attempts' and ${auditLogs.newValues}->>'category' = 'nsfw_content')::int`,
        syncRuns: sql<number>`count(*) filter (where ${auditLogs.tableName} = 'sync_logs')::int`,
      })
      .from(auditLogs);

    return {
      success: true,
      data: stats ?? {
        totalLogs: 0,
        totalTables: 0,
        totalUsers: 0,
        recentActions: 0,
        failedLogins: 0,
        blockedUploads: 0,
        nsfwBlocks: 0,
        syncRuns: 0,
      },
    };
  } catch (error) {
    const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
    console.error("Failed to fetch audit log stats", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch audit log stats",
      data: {
        totalLogs: 0,
        totalTables: 0,
        totalUsers: 0,
        recentActions: 0,
        failedLogins: 0,
        blockedUploads: 0,
        nsfwBlocks: 0,
        syncRuns: 0,
      },
      status,
    };
  }
}

async function requireAuditLogAccess() {
  const user = await getCurrentUser();

  if (!user) {
    throw withStatus("Unauthorized", 401);
  }

  requirePermission(user.role as string | null | undefined, "audit_logs", "view");
}

function withStatus(message: string, status: number) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

function normalizeSource(source: string | undefined) {
  if (!source || source === "all") return null;
  return SOURCES.has(source) ? source : null;
}

function normalizeCategory(category: string | undefined) {
  if (!category || category === "all") return null;
  return CATEGORIES.has(category) ? category : null;
}

function getGroupSources(group: string | undefined) {
  if (!group || group === "all") return null;
  return EVENT_GROUPS[group as keyof typeof EVENT_GROUPS] ? [...EVENT_GROUPS[group as keyof typeof EVENT_GROUPS]] : null;
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

function getEventGroup(tableName: string) {
  if (tableName === "auth_attempts") return "Security";
  if (tableName === "upload_attempts") return "Upload Safety";
  if (tableName === "sync_logs") return "Sync";
  return "Records";
}

function getDisplayTitle(tableName: string, eventName: string | null, eventCategory: string | null, notes: string | null) {
  if (tableName === "auth_attempts") return "Failed login attempt";
  if (tableName === "upload_attempts") {
    if (eventCategory === "nsfw_content") return "Nude or inappropriate upload blocked";
    if (eventCategory === "invalid_mime") return "Invalid MIME upload blocked";
    if (eventCategory === "invalid_signature") return "File signature mismatch blocked";
    if (eventCategory === "invalid_extension") return "Invalid file extension blocked";
    if (eventCategory === "size_limit") return "Oversized upload blocked";
    return "Upload blocked";
  }
  if (tableName === "sync_logs") return "ABEMIS sync event";
  return notes || eventName || `${tableName} change`;
}

import { headers } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs, type NewAuditLog } from "@/lib/db/schema";
import type { AuditAction, AuditContext } from "@/types/audit.types";

type AuditValues = Record<string, unknown>;
type AuditActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null | undefined;
type BlockedUploadFile = {
  name?: string;
  type?: string;
  size?: number;
} | null | undefined;

let ensureAuditLogsTablePromise: Promise<void> | null = null;

export async function ensureAuditLogsTable() {
  if (!ensureAuditLogsTablePromise) {
    ensureAuditLogsTablePromise = (async () => {
      await db.execute(sql`
        create table if not exists audit_logs (
          id uuid primary key default gen_random_uuid(),
          table_name text not null,
          record_id text not null,
          action text not null,
          user_id text,
          user_name text,
          old_values jsonb,
          new_values jsonb,
          changed_fields jsonb,
          ip_address text,
          user_agent text,
          notes text,
          created_at timestamp not null default now()
        )
      `);
      await db.execute(sql`create index if not exists audit_logs_created_at_idx on audit_logs(created_at)`);
      await db.execute(sql`create index if not exists audit_logs_table_name_idx on audit_logs(table_name)`);
      await db.execute(sql`create index if not exists audit_logs_action_idx on audit_logs(action)`);
      await db.execute(sql`create index if not exists audit_logs_user_id_idx on audit_logs(user_id)`);
    })().catch((error) => {
      ensureAuditLogsTablePromise = null;
      throw error;
    });
  }

  await ensureAuditLogsTablePromise;
}

export async function logAudit(params: {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: AuditValues | null;
  newValues?: AuditValues | null;
  notes?: string;
  context?: AuditContext;
}) {
  const changedFields = params.oldValues && params.newValues
    ? getChangedFields(params.oldValues, params.newValues)
    : [];

  const entry: NewAuditLog = {
    tableName: params.tableName,
    recordId: params.recordId,
    action: params.action,
    oldValues: params.oldValues ?? null,
    newValues: params.newValues ?? null,
    changedFields: changedFields.length > 0 ? changedFields : null,
    userId: params.context?.userId ?? null,
    userName: params.context?.userName ?? null,
    ipAddress: params.context?.ipAddress ?? null,
    userAgent: params.context?.userAgent ?? null,
    notes: params.notes ?? null,
    createdAt: new Date(),
  };

  try {
    await ensureAuditLogsTable();
    await db.insert(auditLogs).values(entry);
  } catch (error) {
    console.error("Failed to write audit log", {
      error,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
    });
  }
}

export async function logFailedAuthAttempt(params: {
  email?: string | null;
  method: string;
  reason: string;
  requestPath?: string;
  status?: number;
  context: AuditContext;
}) {
  await logAudit({
    tableName: "auth_attempts",
    recordId: crypto.randomUUID(),
    action: "CREATE",
    newValues: {
      event: "login_failed",
      email: params.email ? params.email.toLowerCase() : null,
      method: params.method,
      requestPath: params.requestPath ?? null,
      status: params.status ?? null,
      reason: params.reason,
    },
    notes: `Failed login attempt via ${params.method}`,
    context: {
      ...params.context,
      userName: params.context.userName || params.email || undefined,
    },
  });
}

export async function logBlockedUploadAttempt(params: {
  actor?: AuditActor;
  request: Request;
  file?: BlockedUploadFile;
  folder?: string | null;
  reason: string;
  category: "invalid_mime" | "invalid_signature" | "invalid_extension" | "nsfw_content" | "size_limit" | "invalid_request";
}) {
  await logAudit({
    tableName: "upload_attempts",
    recordId: crypto.randomUUID(),
    action: "CREATE",
    newValues: {
      event: "upload_blocked",
      category: params.category,
      folder: params.folder ?? null,
      fileName: sanitizeFileName(params.file?.name),
      mimeType: params.file?.type || "unknown",
      fileSize: params.file?.size ?? null,
      reason: params.reason,
    },
    notes: `Upload blocked: ${formatUploadCategory(params.category)}`,
    context: getAuditContextFromRequest(params.request, params.actor),
  });
}

export function getAuditContextFromRequest(request: Request, actor?: AuditActor): AuditContext {
  return {
    ...getActorContext(actor),
    ipAddress: getRequestIpAddress(request.headers),
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function getAuditContextFromServerAction(actor?: AuditActor): Promise<AuditContext> {
  const headerList = await headers();

  return {
    ...getActorContext(actor),
    ipAddress: getRequestIpAddress(headerList),
    userAgent: headerList.get("user-agent") || "unknown",
  };
}

export function getChangedFields(oldValues: AuditValues, newValues: AuditValues) {
  return Object.keys(newValues).filter((key) => {
    return JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]);
  });
}

function getActorContext(actor?: AuditActor): Pick<AuditContext, "userId" | "userName"> {
  if (!actor) {
    return {};
  }

  return {
    userId: actor.id ?? undefined,
    userName: actor.name || actor.email || undefined,
  };
}

function getRequestIpAddress(headerList: Headers) {
  const rawIp = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "unknown";
  return rawIp.split(",")[0]?.trim() || "unknown";
}

function sanitizeFileName(fileName: string | undefined) {
  if (!fileName) return null;
  return fileName.replace(/[^\w.\- ()]/g, "").slice(0, 160);
}

function formatUploadCategory(category: "invalid_mime" | "invalid_signature" | "invalid_extension" | "nsfw_content" | "size_limit" | "invalid_request") {
  if (category === "nsfw_content") return "nude or inappropriate image";
  if (category === "invalid_mime") return "invalid MIME type";
  if (category === "invalid_signature") return "file signature mismatch";
  if (category === "invalid_extension") return "invalid file extension";
  if (category === "size_limit") return "file size limit";
  return "invalid upload request";
}

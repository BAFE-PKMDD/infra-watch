/**
 * Audit logging-related type definitions
 */

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditContext {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

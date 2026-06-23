/**
 * Sync Types
 * Type definitions for ABEMIS sync operations
 */

export interface SyncLog {
  id: string;
  syncType: string;
  status: "running" | "completed" | "failed";
  projectsAdded: number;
  projectsUpdated: number;
  projectsFailed: number;
  totalProcessed: number;
  errors: Array<{
    projectId: string;
    message: string;
  }> | null;
  errorDetails: string | null;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  triggeredBy: string | null;
  createdAt: Date;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SyncLogsResponse {
  success: boolean;
  logs: SyncLog[];
  pagination?: Pagination;
  statistics?: {
    totalProjects: number;
    lastSync: {
      syncedAt: Date;
      status: string;
      projectsAdded: number;
      projectsUpdated: number;
      projectsFailed: number;
      duration: number | null;
    } | null;
  };
}

export interface SyncTriggerRequest {
  syncType?: string;
}

export interface SyncTriggerResponse {
  success: boolean;
  message?: string;
  workflowId?: string;
  run?: {
    workflowId: string;
    [key: string]: any;
  };
  syncLogId?: string;
  statistics?: {
    projectsAdded: number;
    projectsUpdated: number;
    projectsFailed: number;
  };
  duration?: number;
  errors?: Array<{
    projectId: string;
    message: string;
  }>;
  error?: string;
}

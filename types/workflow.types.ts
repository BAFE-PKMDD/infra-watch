/**
 * ABEMIS Sync Progress Event Types
 */

export interface AbemisSyncProgressEvent {
  type: "progress" | "batch-complete" | "complete" | "error";
  status: string;
  currentBatch?: number;
  totalBatches?: number;
  projectsProcessed?: number;
  totalProjects?: number;
  projectsAdded?: number;
  projectsUpdated?: number;
  projectsFailed?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

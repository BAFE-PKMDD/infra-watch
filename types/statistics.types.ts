/**
 * Statistics Types
 * Centralized type definitions for statistics data across the application
 */

export interface ProjectStatistics {
  totalProjects: number;
  totalBudget: number;
  stageBreakdown: StageBreakdown[];
  regionBreakdown: RegionBreakdown[];
}

export interface SyncStatistics {
  totalProjects: number;
  lastSync: LastSyncInfo | null;
}

export interface LastSyncInfo {
  syncedAt: Date;
  status: string;
  projectsAdded: number;
  projectsUpdated: number;
  projectsFailed: number;
  duration: number | null;
}

export interface StageBreakdown {
  stage: string;
  count: number;
}

export interface RegionBreakdown {
  region: string;
  count: number;
}

/**
 * Types for SLA Reports & Analytics
 */

export type SlaTier =
  | "under_1h"
  | "1h_4h"
  | "4h_24h"
  | "1d_3d"
  | "3d_7d"
  | "over_7d";

export interface SlaSummary {
  avgResponseTime: number; // in milliseconds
  medianResponseTime: number; // in milliseconds
  minResponseTime: number; // in milliseconds
  maxResponseTime: number; // in milliseconds
  totalItems: number;
  respondedItems: number;
  resolutionRate?: number; // percentage
  avgResolutionTime?: number; // in milliseconds
}

export interface SlaDistribution {
  tier: SlaTier;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SlaTrendPoint {
  date: string; // ISO date string or formatted date
  avgResponseTime: number;
  itemCount: number;
  avgResolutionTime?: number;
}

export interface SlaTableRow {
  id: string;
  referenceId: string; // Title, ID, or Subject
  status: string;
  category?: string;
  createdAt: Date;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  responseTimeMs?: number | null;
  resolutionTimeMs?: number | null;
  isSlaBreach: boolean;
}

export interface ReportFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  region?: string;
  province?: string;
}

export interface SlaReportData {
  summary: SlaSummary;
  distribution: SlaDistribution[];
  trend: SlaTrendPoint[];
  tableData: SlaTableRow[];
}

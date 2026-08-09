export const SCHEDULE_HEALTH_VALUES = [
  "onTrack",
  "atRisk",
  "delayed",
  "notAssessed",
] as const;

export type ScheduleHealth = (typeof SCHEDULE_HEALTH_VALUES)[number];

export const PROJECT_STATUS_FILTER_VALUES = [
  "planned",
  "ongoing",
  "completed",
  "suspended",
] as const;

export type ProjectStatusFilter = (typeof PROJECT_STATUS_FILTER_VALUES)[number];

export type ManagerialDashboardFilters = {
  program?: string;
  year?: string;
  region?: string;
  province?: string;
  projectType?: string;
  status?: ProjectStatusFilter;
  health?: ScheduleHealth;
};

export type ManagerialDashboardData = {
  asOf: string;
  freshness: {
    lastSuccessfulSyncAt: string | null;
    latestSyncStatus: string | null;
    isStale: boolean;
    staleAfterHours: number;
  };
  coverage: {
    total: number;
    withBudget: number;
    withApprovedBudgetForContract: number;
    withSchedule: number;
    withPhysicalProgress: number;
    withFinancialData: number;
  };
  kpis: {
    totalProjects: number;
    allocatedBudget: number;
    approvedBudgetForContract: number;
    completionRate: number;
    delayedProjects: number;
    atRiskProjects: number;
  };
  scheduleHealth: Array<{ key: ScheduleHealth; count: number; budget: number }>;
  regions: Array<{
    region: string;
    total: number;
    assessed: number;
    completed: number;
    delayed: number;
    atRisk: number;
    completionRate: number;
    allocatedBudget: number;
  }>;
  projectTypes: Array<{
    projectType: string;
    total: number;
    allocatedBudget: number;
    delayed: number;
  }>;
  progressVariance: Array<{
    projectId: string;
    projectName: string;
    expectedProgress: number;
    physicalProgress: number;
    variance: number;
    health: ScheduleHealth;
  }>;
  priorityProjects: Array<{
    projectId: string;
    projectName: string;
    program: string;
    region: string | null;
    province: string | null;
    projectType: string;
    allocatedBudget: number | null;
    physicalProgress: number | null;
    targetCompletionDate: string | null;
    daysToTarget: number | null;
    scheduleVariance: number | null;
    health: ScheduleHealth;
    reason: string;
  }>;
  insights: Array<{
    severity: "info" | "warning" | "critical";
    title: string;
    detail: string;
    filter?: Partial<ManagerialDashboardFilters>;
  }>;
  filterOptions: {
    programs: string[];
    years: string[];
    regions: string[];
    provinces: string[];
    projectTypes: string[];
    statuses: ProjectStatusFilter[];
  };
};

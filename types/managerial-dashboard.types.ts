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

export type CompletionDelayBucket = "onTimeOrEarly" | "late1to30" | "late31to90" | "late91to180" | "late181to365" | "lateOver365";
export type ContractLengthBucket = "30orLess" | "31to60" | "61to90" | "91to180" | "over180";
export type OverdueBucket = "notYetDue" | "under6mo" | "6to12mo" | "1to2yr" | "over2yr" | "noDates";
export type TurnoverBucket = "under6mo" | "6to12mo" | "1to2yr" | "2to4yr" | "over4yr";

export type ManagerialDashboardFilters = {
  program?: string;
  year?: string;
  region?: string;
  province?: string;
  projectType?: string;
  status?: ProjectStatusFilter;
  health?: ScheduleHealth;
};

export type ManagerialDashboardDrillthroughProject = {
  projectId: string;
  projectName: string;
  program: string;
  region: string | null;
  province: string | null;
  projectType: string;
  status: ProjectStatusFilter;
  health: ScheduleHealth;
  allocatedBudget: number | null;
  physicalProgress: number | null;
  expectedProgress: number | null;
  variance: number | null;
  targetCompletionDate: string | null;
  ntpDate: string | null;
  calendarDays: number | null;
};

export type ManagerialDashboardDrillthroughData = {
  asOf: string;
  total: number;
  page: number;
  pageSize: number;
  projects: ManagerialDashboardDrillthroughProject[];
};

export type DashboardBreakdownDimension = "province" | "program";

export type ManagerialDashboardBreakdownRow = {
  key: string;
  total: number;
  delayed: number;
  allocatedBudget: number;
};

export type ManagerialDashboardBreakdownData = {
  asOf: string;
  dimension: DashboardBreakdownDimension;
  rows: ManagerialDashboardBreakdownRow[];
};

export type RegionCostRow = { region: string; total: number; medianBudget: number | null; p25Budget: number | null; p75Budget: number | null };

export type ManagerialDashboardCostByRegionData = {
  asOf: string;
  projectType: string;
  nationwide: { total: number; medianBudget: number | null; p25Budget: number | null; p75Budget: number | null };
  regions: RegionCostRow[];
};

export type ManagerialDashboardProgressCurveData = {
  projectId: string;
  projectName: string;
  points: Array<{ date: string; actualProgress: number; plannedProgress: number | null }>;
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
    withActualBidAmount: number;
    withSchedule: number;
    withPhysicalProgress: number;
    withFinancialData: number;
  };
  kpis: {
    totalProjects: number;
    allocatedBudget: number;
    actualBidAmount: number;
    completionRate: number;
    delayedProjects: number;
    atRiskProjects: number;
    bidExceedsBudgetCount: number;
    bidOverrunTotal: number;
  };
  scheduleHealth: Array<{ key: ScheduleHealth; count: number; budget: number }>;
  statusBreakdown?: Array<{
    key: ProjectStatusFilter;
    count: number;
    allocatedBudget: number;
  }>;
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
  fundingYears: Array<{
    yearFunded: string;
    total: number;
    assessed: number;
    completed: number;
    delayed: number;
    completionRate: number;
    allocatedBudget: number;
  }>;
  statusByYear?: Array<{
    yearFunded: string;
    counts: Record<ProjectStatusFilter, number>;
    allocatedBudget: Record<ProjectStatusFilter, number>;
  }>;
  regionCategories?: Array<{
    region: string;
    categories: Record<string, { count: number; budget: number }>;
  }>;
  commonProjectTypes?: Array<{
    projectType: string;
    category: string | null;
    total: number;
    allocatedBudget: number;
    medianBudget: number | null;
    p25Budget: number | null;
    p75Budget: number | null;
  }>;
  procurementModes?: Array<{ mode: string; total: number; allocatedBudget: number }>;
  completionDelayBuckets?: Array<{ bucket: CompletionDelayBucket; count: number }>;
  lateDaysByRegion?: Array<{ key: string; medianLateDays: number | null; lateCount: number; totalWithDates: number }>;
  lateDaysByProjectType?: Array<{ key: string; medianLateDays: number | null; lateCount: number; totalWithDates: number }>;
  lateRateByContractLength?: Array<{ bucket: ContractLengthBucket; lateCount: number; total: number }>;
  lateRateByYear?: Array<{ yearFunded: string; lateCount: number; total: number }>;
  ntpLagByProcurementMode?: Array<{ mode: string; medianDays: number | null; p25Days: number | null; p75Days: number | null }>;
  ongoingOverdueBuckets?: Array<{ bucket: OverdueBucket; zeroProgress: number; someProgress: number }>;
  ongoingByYear?: Array<{ yearFunded: string; zeroProgress: number; someProgress: number }>;
  turnoverBacklog?: {
    buckets: Array<{ bucket: TurnoverBucket; count: number }>;
    byRegion: Array<{ region: string; waiting: number; waitingOver1Year: number; allocatedBudget: number }>;
  };
  contractors?: Array<{
    name: string;
    projectsChecked: number;
    medianLateDays: number | null;
    latePct: number | null;
    overThreeMonthsLatePct: number | null;
    contractValue: number;
    regionCount: number;
    mostlyBuilds: string | null;
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
    forecast?: {
      status: "insufficientHistory" | "stalled" | "projected" | "completed" | "inactive";
      projectedCompletionDate: string | null;
      confidence: "low" | "medium" | "high" | null;
      targetRisk: boolean | null;
    };
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
  trend: {
    status: "insufficientHistory" | "ready";
    points: Array<{ date: string; averageProgress: number; sampleSize: number; total: number }>;
    sampleCount: number;
    spanDays: number;
    maxGapDays: number;
  };
};

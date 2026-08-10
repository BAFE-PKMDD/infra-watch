import { tool } from "ai";
import { z } from "zod";

import { getManagerialDashboardData } from "./managerial-dashboard-query";
import {
  getManagerialDashboardChanges,
  type ManagerialDashboardChanges,
} from "./dashboard-changes";
import type { ScopedUser } from "@/lib/scope";
import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export const MANAGERIAL_BREAKDOWN_DIMENSIONS = [
  "region",
  "projectType",
  "status",
  "scheduleHealth",
] as const;

const MAX_BREAKDOWN_ROWS = 12;
const MAX_PRIORITY_PROJECTS = 10;

export const MANAGERIAL_KPI_DEFINITIONS = {
  totalProjects: "Projects in the authorized filtered dashboard scope.",
  allocatedBudget: "Sum of reported allocated budget; missing values are not inferred.",
  approvedBudgetForContract: "Sum of reported approved budget for contract; missing values are not inferred.",
  completionRate:
    "Completed projects divided by all projects in the authorized filtered scope, multiplied by 100.",
  delayedProjects: "Projects classified as delayed by the dashboard's deterministic schedule-health rules.",
  atRiskProjects: "Projects classified as at risk by the dashboard's deterministic schedule-health rules.",
} as const;

type ManagerialAiUser = ScopedUser & { id: string };
type DashboardLoader = (
  filters: ManagerialDashboardFilters,
  user: ManagerialAiUser,
) => Promise<ManagerialDashboardData>;

type OperationsInput = {
  filters: ManagerialDashboardFilters;
  user: ManagerialAiUser;
  getDashboardData?: DashboardLoader;
  getDashboardChangesData?: (
    filters: ManagerialDashboardFilters,
    user: ManagerialAiUser,
  ) => Promise<ManagerialDashboardChanges>;
};

function projectUrl(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}`;
}

function authorizedScope(user: ManagerialAiUser) {
  return {
    role: user.role ?? null,
    region: user.role === "moderator" ? user.region ?? null : null,
    program: user.role === "moderator" ? user.assignedAgency ?? null : null,
  };
}

export function createManagerialAiOperations({
  filters,
  user,
  getDashboardData = getManagerialDashboardData,
  getDashboardChangesData = getManagerialDashboardChanges,
}: OperationsInput) {
  let dashboardPromise: Promise<ManagerialDashboardData> | undefined;
  const load = () =>
    (dashboardPromise ??= getDashboardData(filters, user));

  return {
    async getCurrentDashboardSummary() {
      const data = await load();
      return {
        asOf: data.asOf,
        activeFilters: filters,
        authorizedScope: authorizedScope(user),
        freshness: data.freshness,
        coverage: data.coverage,
        kpis: data.kpis,
        definitions: MANAGERIAL_KPI_DEFINITIONS,
        expenditure: {
          available: false,
          reason: "Expenditure is not available in the approved dashboard data.",
        },
      };
    },

    async getDashboardBreakdown(
      dimension: (typeof MANAGERIAL_BREAKDOWN_DIMENSIONS)[number],
    ) {
      const data = await load();
      let rows: unknown[];
      let available = true;
      if (dimension === "region") rows = data.regions;
      else if (dimension === "projectType") rows = data.projectTypes;
      else if (dimension === "scheduleHealth") rows = data.scheduleHealth;
      else {
        rows = data.statusBreakdown ?? [];
        available = Boolean(data.statusBreakdown);
      }
      return {
        asOf: data.asOf,
        activeFilters: filters,
        dimension,
        available,
        unavailableReason: available
          ? undefined
          : "A trusted status breakdown is not available in the current dashboard DTO.",
        rows: rows.slice(0, MAX_BREAKDOWN_ROWS),
        truncated: rows.length > MAX_BREAKDOWN_ROWS,
      };
    },

    async getPriorityProjects(requestedLimit = MAX_PRIORITY_PROJECTS) {
      const data = await load();
      const limit = Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PRIORITY_PROJECTS);
      return {
        asOf: data.asOf,
        activeFilters: filters,
        projects: data.priorityProjects.slice(0, limit).map((project) => ({
          ...project,
          url: projectUrl(project.projectId),
          untrustedText: true as const,
        })),
      };
    },

    async getProjectRiskExplanation(projectId: string) {
      const data = await load();
      const project = data.priorityProjects.find((item) => item.projectId === projectId);
      const variance = data.progressVariance.find((item) => item.projectId === projectId);
      if (!project) {
        return {
          found: false as const,
          asOf: data.asOf,
          message: "Project is unavailable in the authorized dashboard scope.",
        };
      }
      return {
        found: true as const,
        asOf: data.asOf,
        project: {
          projectId: project.projectId,
          name: project.projectName,
          url: projectUrl(project.projectId),
          program: project.program,
          region: project.region,
          province: project.province,
          projectType: project.projectType,
          allocatedBudget: project.allocatedBudget,
          targetCompletionDate: project.targetCompletionDate,
          untrustedText: true as const,
        },
        deterministicRisk: {
          reason: project.reason,
          inputs: {
            expectedProgress: variance?.expectedProgress ?? null,
            physicalProgress: project.physicalProgress,
            variance: project.scheduleVariance,
            health: project.health,
          },
          rule:
            "Schedule health is calculated by the dashboard from reported schedule dates and physical-progress evidence; missing inputs are not inferred.",
        },
        forecast: project.forecast?.status === "projected"
          ? {
              available: true,
              status: project.forecast.status,
              projectedCompletionDate: project.forecast.projectedCompletionDate,
              confidence: project.forecast.confidence,
              targetRisk: project.forecast.targetRisk,
            }
          : {
              available: false,
              status: project.forecast?.status ?? "insufficientHistory",
              reason:
                project.forecast?.status === "stalled"
                  ? "Reported progress is stalled; no completion date is projected."
                  : project.forecast?.status === "inactive"
                    ? "The project is not in an active implementation lifecycle; no completion date is projected."
                  : "Insufficient approved snapshot history for a statistical forecast.",
            },
      };
    },

    async getDashboardChanges() {
      return getDashboardChangesData(filters, user);
    },
  };
}

export function createManagerialAiTools(input: OperationsInput) {
  const operations = createManagerialAiOperations(input);
  return {
    getCurrentDashboardSummary: tool({
      description: "Return the trusted current dashboard KPIs, coverage, freshness, timestamp, scope, and KPI definitions.",
      inputSchema: z.object({}).strict(),
      execute: () => operations.getCurrentDashboardSummary(),
    }),
    getDashboardBreakdown: tool({
      description: "Return a bounded trusted dashboard aggregate breakdown.",
      inputSchema: z.object({ dimension: z.enum(MANAGERIAL_BREAKDOWN_DIMENSIONS) }).strict(),
      execute: ({ dimension }) => operations.getDashboardBreakdown(dimension),
    }),
    getPriorityProjects: tool({
      description: "Return up to ten trusted priority-project rows and exact canonical local URLs.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(MAX_PRIORITY_PROJECTS).default(MAX_PRIORITY_PROJECTS) }).strict(),
      execute: ({ limit }) => operations.getPriorityProjects(limit),
    }),
    getProjectRiskExplanation: tool({
      description: "Return deterministic risk evidence for one project in the authorized dashboard scope.",
      inputSchema: z.object({ projectId: z.string().trim().min(1).max(100) }).strict(),
      execute: ({ projectId }) => operations.getProjectRiskExplanation(projectId),
    }),
    getDashboardChanges: tool({
      description: "Compare bounded trusted aggregates from the latest two authorized project snapshot dates.",
      inputSchema: z.object({}).strict(),
      execute: () => operations.getDashboardChanges(),
    }),
  };
}

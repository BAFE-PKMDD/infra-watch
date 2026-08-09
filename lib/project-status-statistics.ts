import { mapInternalToPublicStage } from "@/constants/stage-mapping";

type ProjectStatusCount = {
  status: string | null;
  count: number;
};

type ProjectStatusStatistics = {
  total: number;
  planned: number;
  ongoing: number;
  completed: number;
  suspended: number;
};

export function aggregateProjectStatusCounts(
  rows: ProjectStatusCount[],
): ProjectStatusStatistics {
  const statistics: ProjectStatusStatistics = {
    total: 0,
    planned: 0,
    ongoing: 0,
    completed: 0,
    suspended: 0,
  };

  for (const row of rows) {
    const count = Number(row.count);
    statistics.total += count;

    if (row.status?.toLowerCase().trim() === "suspended") {
      statistics.suspended += count;
      continue;
    }

    const publicStage = mapInternalToPublicStage(row.status);
    if (publicStage === "Completed") {
      statistics.completed += count;
    } else if (publicStage === "On going") {
      statistics.ongoing += count;
    } else {
      statistics.planned += count;
    }
  }

  return statistics;
}

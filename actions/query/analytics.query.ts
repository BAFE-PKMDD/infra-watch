import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export interface StageStat {
  labelKey: string;
  count: number;
  percentage: number;
}

export interface RegionalStat {
  region: string;
  target: number;
  turnedOver: number;
}

export interface BannerStat {
  program: string;
  target: number;
  turnedOver: number;
}

export interface InfraAnalyticsData {
  asOfDate: string;
  scopeLabel: string;
  totalTarget: number;
  stages: {
    preImplementation: StageStat;
    procurement: StageStat;
    construction: StageStat;
    completed: StageStat;
    turnedOver: StageStat;
  };
  regionalStats: RegionalStat[];
  bannerStats: BannerStat[];
}

export type InfraAnalyticsResult =
  | { status: "ready"; data: InfraAnalyticsData }
  | { status: "empty" | "unavailable"; data: null };

export type InfraAnalyticsRow = {
  status: string;
  stage: string | null;
  region: string | null;
  bannerProgram: string | null;
  program: string | null;
  yearFunded: string | null;
  lastSyncedAt: Date;
};

type QueryRows = () => Promise<InfraAnalyticsRow[]>;

export function aggregateInfraAnalyticsRows(
  rows: InfraAnalyticsRow[],
): InfraAnalyticsResult {
  if (rows.length === 0) return { status: "empty", data: null };

  const stageKeys = [
    "preImplementation",
    "procurement",
    "construction",
    "completed",
    "turnedOver",
  ] as const;
  const stageCounts = Object.fromEntries(stageKeys.map((key) => [key, 0])) as Record<
    (typeof stageKeys)[number],
    number
  >;
  const regionalCounts = new Map<string, { target: number; turnedOver: number }>();
  const bannerCounts = new Map<string, { target: number; turnedOver: number }>();

  for (const row of rows) {
    const stage = getProjectStage(row.status, row.stage);
    stageCounts[stage] += 1;
    increment(regionalCounts, mapDbRegionToLabel(row.region), stage === "turnedOver");
    increment(bannerCounts, normalizedDimension(row.bannerProgram), stage === "turnedOver");
  }

  const stages = Object.fromEntries(
    stageKeys.map((key) => [
      key,
      {
        labelKey: key,
        count: stageCounts[key],
        percentage: percentage(stageCounts[key], rows.length),
      },
    ]),
  ) as InfraAnalyticsData["stages"];

  const latestSync = rows.reduce<Date | null>((latest, row) => {
    const date = new Date(row.lastSyncedAt);
    if (Number.isNaN(date.getTime())) return latest;
    return !latest || date > latest ? date : latest;
  }, null);

  return {
    status: "ready",
    data: {
      asOfDate: latestSync
        ? new Intl.DateTimeFormat("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Manila",
          }).format(latestSync)
        : "Unknown",
      scopeLabel: buildScopeLabel(rows),
      totalTarget: rows.length,
      stages,
      regionalStats: [...regionalCounts.entries()]
        .map(([region, value]) => ({ region, ...value }))
        .sort((a, b) => a.region.localeCompare(b.region, undefined, { numeric: true })),
      bannerStats: limitBannerStats(
        [...bannerCounts.entries()]
          .map(([program, value]) => ({ program, ...value }))
          .sort((a, b) => b.target - a.target || a.program.localeCompare(b.program)),
      ),
    },
  };
}

export async function getInfraAnalyticsData(
  queryRows: QueryRows = queryInfraAnalyticsRows,
  reportError: () => void = () => console.error("Public infrastructure analytics query unavailable"),
): Promise<InfraAnalyticsResult> {
  try {
    return aggregateInfraAnalyticsRows(await queryRows());
  } catch {
    reportError();
    return { status: "unavailable", data: null };
  }
}

async function queryInfraAnalyticsRows(): Promise<InfraAnalyticsRow[]> {
  return db
    .select({
      status: projects.status,
      stage: projects.stage,
      region: projects.region,
      bannerProgram: projects.bannerProgram,
      program: projects.program,
      yearFunded: projects.yearFunded,
      lastSyncedAt: projects.lastSyncedAt,
    })
    .from(projects);
}

function getProjectStage(
  status: string,
  stage: string | null,
): "preImplementation" | "procurement" | "construction" | "completed" | "turnedOver" {
  const normalizedStage = (stage ?? "").toLowerCase();
  const normalizedStatus = status.toLowerCase();
  if (normalizedStage.includes("turn") || normalizedStage.includes("over")) return "turnedOver";
  if (normalizedStatus === "completed" || normalizedStage.includes("complete")) return "completed";
  if (
    normalizedStage.includes("construction") ||
    normalizedStatus === "ongoing" ||
    normalizedStage.includes("implement")
  ) return "construction";
  if (normalizedStage.includes("procure")) return "procurement";
  return "preImplementation";
}

function mapDbRegionToLabel(region: string | null): string {
  if (!region?.trim()) return "Unknown";
  const value = region.toUpperCase();
  const mappings: Array<[RegExp, string]> = [
    [/NCR|NATIONAL CAPITAL/, "NCR"],
    [/\bCAR\b|CORDILLERA/, "CAR"],
    [/REGION\s+(1|I)\b|ILOCOS/, "R1"],
    [/REGION\s+(2|II)\b|CAGAYAN/, "R2"],
    [/REGION\s+(3|III)\b|CENTRAL LUZON/, "R3"],
    [/CALABARZON|REGION\s+(IV-A|4A)/, "R4A"],
    [/MIMAROPA|REGION\s+(IV-B|4B)/, "R4B"],
    [/REGION\s+(5|V)\b|BICOL/, "R5"],
    [/REGION\s+(6|VI)\b|WESTERN VISAYAS/, "R6"],
    [/REGION\s+(7|VII)\b|CENTRAL VISAYAS/, "R7"],
    [/REGION\s+(8|VIII)\b|EASTERN VISAYAS/, "R8"],
    [/REGION\s+(9|IX)\b|ZAMBOANGA/, "R9"],
    [/REGION\s+(10|X)\b|NORTHERN MINDANAO/, "R10"],
    [/REGION\s+(11|XI)\b|DAVAO/, "R11"],
    [/REGION\s+(12|XII)\b|SOCCSKSARGEN/, "R12"],
    [/REGION\s+(13|XIII)\b|CARAGA/, "R13"],
    [/BARMM|BANGSAMORO/, "BARMM"],
    [/\bNIR\b|NEGROS ISLAND/, "NIR"],
  ];
  return mappings.find(([pattern]) => pattern.test(value))?.[1] ?? "Unknown";
}

function normalizedDimension(value: string | null) {
  return value?.trim() || "Unknown";
}

function increment(
  map: Map<string, { target: number; turnedOver: number }>,
  key: string,
  turnedOver: boolean,
) {
  const current = map.get(key) ?? { target: 0, turnedOver: 0 };
  current.target += 1;
  if (turnedOver) current.turnedOver += 1;
  map.set(key, current);
}

function percentage(count: number, total: number) {
  return total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
}

function buildScopeLabel(rows: InfraAnalyticsRow[]) {
  const programs = uniqueKnown(rows.map((row) => row.program));
  const years = uniqueKnown(rows.map((row) => row.yearFunded));
  const programLabel = programs.length === 1 ? programs[0] : programs.length > 1 ? "Multiple programs" : "Program unavailable";
  const yearLabel = years.length === 1 ? `FY ${years[0]}` : years.length > 1 ? "Multiple funding years" : "Funding year unavailable";
  return `${programLabel} · ${yearLabel}`;
}

function uniqueKnown(values: Array<string | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].sort();
}

function limitBannerStats(items: BannerStat[], maximum = 11): BannerStat[] {
  if (items.length <= maximum) return items;
  const unknown = items.find((item) => item.program === "Unknown");
  const known = items.filter((item) => item.program !== "Unknown");
  const keepCount = maximum - (unknown ? 1 : 0) - 1;
  const kept = known.slice(0, keepCount);
  const remainder = known.slice(keepCount);
  const other = remainder.reduce<BannerStat>(
    (aggregate, item) => ({
      program: "Other",
      target: aggregate.target + item.target,
      turnedOver: aggregate.turnedOver + item.turnedOver,
    }),
    { program: "Other", target: 0, turnedOver: 0 },
  );
  return [...kept, ...(unknown ? [unknown] : []), other];
}

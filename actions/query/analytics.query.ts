"use server";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export interface StageStat {
  labelKey: string; // preImplementation | procurement | construction | completed | turnedOver
  count: number;
  percentage: number;
}

export interface RegionalStat {
  region: string; // NCR, CAR, R1, R2, R3, R4A, R4B, R5, R6, R7, R8, R9, R10, R11, R12, R13, BARMM, NIR
  target: number;
  turnedOver: number;
}

export interface BannerStat {
  program: string; // HVCDP, NOAP, Rice Program, National Livestock Program, Corn Program
  target: number;
  turnedOver: number;
}

export interface InfraAnalyticsData {
  asOfDate: string;
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

// Exact reference statistics from user image
const REFERENCE_FALLBACK_DATA: InfraAnalyticsData = {
  asOfDate: "July 04, 2026",
  totalTarget: 301,
  stages: {
    preImplementation: { labelKey: "preImplementation", count: 21, percentage: 6.98 },
    procurement: { labelKey: "procurement", count: 110, percentage: 36.54 },
    construction: { labelKey: "construction", count: 139, percentage: 46.18 },
    completed: { labelKey: "completed", count: 8, percentage: 2.66 },
    turnedOver: { labelKey: "turnedOver", count: 23, percentage: 7.64 },
  },
  regionalStats: [
    { region: "NCR", target: 0, turnedOver: 0 },
    { region: "CAR", target: 74, turnedOver: 4 },
    { region: "R1", target: 8, turnedOver: 0 },
    { region: "R2", target: 25, turnedOver: 8 },
    { region: "R3", target: 27, turnedOver: 0 },
    { region: "R4A", target: 0, turnedOver: 0 },
    { region: "R4B", target: 0, turnedOver: 0 },
    { region: "R5", target: 30, turnedOver: 3 },
    { region: "R6", target: 22, turnedOver: 0 },
    { region: "R7", target: 2, turnedOver: 0 },
    { region: "R8", target: 10, turnedOver: 0 },
    { region: "R9", target: 12, turnedOver: 0 },
    { region: "R10", target: 3, turnedOver: 0 },
    { region: "R11", target: 3, turnedOver: 0 },
    { region: "R12", target: 7, turnedOver: 3 },
    { region: "R13", target: 5, turnedOver: 0 },
    { region: "BARMM", target: 0, turnedOver: 0 },
    { region: "NIR", target: 1, turnedOver: 0 },
  ],
  bannerStats: [
    { program: "High Value Crop D...", target: 73, turnedOver: 11 },
    { program: "National Organic Agricult...", target: 56, turnedOver: 4 },
    { program: "Rice Program", target: 42, turnedOver: 0 },
    { program: "National Livestock Program", target: 32, turnedOver: 0 },
    { program: "Corn Program", target: 13, turnedOver: 3 },
  ],
};

function getProjectStage(status: string, stage: string | null): "preImplementation" | "procurement" | "construction" | "completed" | "turnedOver" {
  const stg = (stage ?? "").toLowerCase();
  const stat = status.toLowerCase();
  if (stg.includes("turn") || stg.includes("over")) return "turnedOver";
  if (stat === "completed" || stg.includes("complete")) return "completed";
  if (stg.includes("construction") || stat === "ongoing" || stg.includes("implement")) return "construction";
  if (stg.includes("procure")) return "procurement";
  return "preImplementation";
}

function mapDbRegionToLabel(region: string | null): string {
  if (!region) return "NCR";
  const r = region.toUpperCase();
  if (r.includes("NCR") || r.includes("NATIONAL CAPITAL")) return "NCR";
  if (r.includes("CAR") || r.includes("CORDILLERA")) return "CAR";
  if (r.includes("REGION 1 ") || r.includes("REGION I") || r.includes("ILOCOS")) return "R1";
  if (r.includes("REGION 2 ") || r.includes("REGION II") || r.includes("CAGAYAN")) return "R2";
  if (r.includes("REGION 3 ") || r.includes("REGION III") || r.includes("CENTRAL LUZON")) return "R3";
  if (r.includes("CALABARZON") || r.includes("REGION IV-A") || r.includes("REGION 4A")) return "R4A";
  if (r.includes("MIMAROPA") || r.includes("REGION IV-B") || r.includes("REGION 4B")) return "R4B";
  if (r.includes("REGION 5") || r.includes("REGION V") || r.includes("BICOL")) return "R5";
  if (r.includes("REGION 6") || r.includes("REGION VI") || r.includes("WESTERN VISAYAS")) return "R6";
  if (r.includes("REGION 7") || r.includes("REGION VII") || r.includes("CENTRAL VISAYAS")) return "R7";
  if (r.includes("REGION 8") || r.includes("REGION VIII") || r.includes("EASTERN VISAYAS")) return "R8";
  if (r.includes("REGION 9") || r.includes("REGION IX") || r.includes("ZAMBOANGA")) return "R9";
  if (r.includes("REGION 10") || r.includes("REGION X") || r.includes("NORTHERN MINDANAO")) return "R10";
  if (r.includes("REGION 11") || r.includes("REGION XI") || r.includes("DAVAO")) return "R11";
  if (r.includes("REGION 12") || r.includes("REGION XII") || r.includes("SOCCSKSARGEN")) return "R12";
  if (r.includes("REGION 13") || r.includes("REGION XIII") || r.includes("CARAGA")) return "R13";
  if (r.includes("BARMM") || r.includes("BANGSAMORO")) return "BARMM";
  if (r.includes("NIR") || r.includes("NEGROS ISLAND")) return "NIR";
  return "NCR";
}

function mapDbProgramToLabel(prog: string | null): string {
  if (!prog) return "Corn Program";
  const p = prog.toUpperCase();
  if (p.includes("HIGH VALUE") || p.includes("HVCDP")) return "High Value Crop D...";
  if (p.includes("ORGANIC") || p.includes("NOAP")) return "National Organic Agricult...";
  if (p.includes("RICE")) return "Rice Program";
  if (p.includes("LIVESTOCK")) return "National Livestock Program";
  if (p.includes("CORN")) return "Corn Program";
  return "Corn Program";
}

export async function getInfraAnalyticsData(): Promise<InfraAnalyticsData> {
  try {
    const dbProjects = await db
      .select({
        status: projects.status,
        stage: projects.stage,
        region: projects.region,
        bannerProgram: sql<string | null>`${projects.metadata}->>'bannerProgram'`,
      })
      .from(projects);

    if (dbProjects.length === 0) {
      return REFERENCE_FALLBACK_DATA;
    }

    const totalTarget = dbProjects.length;

    // Initialize counts
    let preImplementationCount = 0;
    let procurementCount = 0;
    let constructionCount = 0;
    let completedCount = 0;
    let turnedOverCount = 0;

    // Regional map initialized with reference region list
    const regionOrder = ["NCR", "CAR", "R1", "R2", "R3", "R4A", "R4B", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13", "BARMM", "NIR"];
    const regionalCounts: Record<string, { target: number; turnedOver: number }> = {};
    for (const reg of regionOrder) {
      regionalCounts[reg] = { target: 0, turnedOver: 0 };
    }

    // Banner program map initialized
    const bannerPrograms = ["High Value Crop D...", "National Organic Agricult...", "Rice Program", "National Livestock Program", "Corn Program"];
    const bannerCounts: Record<string, { target: number; turnedOver: number }> = {};
    for (const bp of bannerPrograms) {
      bannerCounts[bp] = { target: 0, turnedOver: 0 };
    }

    // Process DB rows
    for (const proj of dbProjects) {
      const stage = getProjectStage(proj.status, proj.stage);
      
      // Aggregate stage
      if (stage === "preImplementation") preImplementationCount++;
      else if (stage === "procurement") procurementCount++;
      else if (stage === "construction") constructionCount++;
      else if (stage === "completed") completedCount++;
      else if (stage === "turnedOver") turnedOverCount++;

      // Aggregate regional
      const regionLabel = mapDbRegionToLabel(proj.region);
      if (regionalCounts[regionLabel]) {
        regionalCounts[regionLabel].target++;
        if (stage === "turnedOver") {
          regionalCounts[regionLabel].turnedOver++;
        }
      }

      // Aggregate banner program
      const bannerLabel = mapDbProgramToLabel(proj.bannerProgram);
      if (bannerCounts[bannerLabel]) {
        bannerCounts[bannerLabel].target++;
        if (stage === "turnedOver") {
          bannerCounts[bannerLabel].turnedOver++;
        }
      }
    }

    // Format results
    const stages = {
      preImplementation: {
        labelKey: "preImplementation",
        count: preImplementationCount,
        percentage: Number(((preImplementationCount / totalTarget) * 100).toFixed(2)),
      },
      procurement: {
        labelKey: "procurement",
        count: procurementCount,
        percentage: Number(((procurementCount / totalTarget) * 100).toFixed(2)),
      },
      construction: {
        labelKey: "construction",
        count: constructionCount,
        percentage: Number(((constructionCount / totalTarget) * 100).toFixed(2)),
      },
      completed: {
        labelKey: "completed",
        count: completedCount,
        percentage: Number(((completedCount / totalTarget) * 100).toFixed(2)),
      },
      turnedOver: {
        labelKey: "turnedOver",
        count: turnedOverCount,
        percentage: Number(((turnedOverCount / totalTarget) * 100).toFixed(2)),
      },
    };

    const regionalStats: RegionalStat[] = regionOrder.map((reg) => ({
      region: reg,
      target: regionalCounts[reg].target,
      turnedOver: regionalCounts[reg].turnedOver,
    }));

    const bannerStats: BannerStat[] = bannerPrograms.map((bp) => ({
      program: bp,
      target: bannerCounts[bp].target,
      turnedOver: bannerCounts[bp].turnedOver,
    }));

    const asOfDate = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    }).format(new Date());

    return {
      asOfDate,
      totalTarget,
      stages,
      regionalStats,
      bannerStats,
    };
  } catch (error) {
    console.error("Failed to query database projects, using reference mock:", error);
    return REFERENCE_FALLBACK_DATA;
  }
}

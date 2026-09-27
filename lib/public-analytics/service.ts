import "server-only";

import { and, eq, inArray, max, or, sql } from "drizzle-orm";

import { ABEMIS_SYNC_START_YEAR, ABEMIS_SYNC_YEARS } from "@/lib/abemis/year-scope";
import { db } from "@/lib/db";
import { projects, psgcLocations } from "@/lib/db/schema";

import type { PublicProject } from "./aggregate";
import {
  buildPlannedVsActual,
  cleanBudget,
  cleanContractor,
  cleanDate,
  cleanStartAndFinish,
  getFacilityCategory,
  getPublicStage,
  isFarmerGroup,
  isValidMapLocation,
  normalizeBannerProgram,
  normalizeProjectType,
  orderPublicPhotos,
  parseBudgetYear,
  publicBeneficiary,
  repairPlaceName,
} from "./rules";

/**
 * Public pages keep the app-wide ABEMIS budget-year range (lib/abemis/year-scope.ts), so
 * charts start at its first year. Only the year range applies here: which records count
 * is decided by the public stage rule, not by the sync's stage filters.
 */
export const PUBLIC_FIRST_YEAR = ABEMIS_SYNC_START_YEAR;

const inPublicYearRange = () => inArray(sql`trim(${projects.yearFunded})`, ABEMIS_SYNC_YEARS);

// Re-check the source for a newer sync at most this often.
const VERSION_CHECK_INTERVAL_MS = 60_000;

type Snapshot = { version: string; checkedAt: number; rows: PublicProject[]; dataAsOf: Date | null };

let snapshot: Snapshot | null = null;
let loading: Promise<Snapshot> | null = null;

type PsgcNames = { municipality: string | null; barangay: string | null };

async function loadPsgcNames(): Promise<Map<string, PsgcNames>> {
  const codes = db.selectDistinct({ code: projects.psgcCode }).from(projects);
  const rows = await db
    .select({
      geoCode: psgcLocations.geoCode,
      geoCode1: psgcLocations.geoCode1,
      municipality: psgcLocations.municipalityName,
      barangay: psgcLocations.barangayName,
    })
    .from(psgcLocations)
    .where(or(inArray(psgcLocations.geoCode, codes), inArray(psgcLocations.geoCode1, codes)));
  const map = new Map<string, PsgcNames>();
  for (const row of rows) {
    const names = { municipality: row.municipality?.trim() || null, barangay: row.barangay?.trim() || null };
    map.set(row.geoCode, names);
    if (row.geoCode1) map.set(row.geoCode1, names);
  }
  return map;
}

async function readVersion() {
  const [row] = await db
    .select({ lastSynced: max(projects.lastSyncedAt), total: sql<number>`count(*)::int` })
    .from(projects);
  return { version: `${row?.lastSynced?.toISOString() ?? "none"}:${row?.total ?? 0}`, dataAsOf: row?.lastSynced ?? null };
}

async function loadSnapshot(version: string, dataAsOf: Date | null): Promise<Snapshot> {
  const [rows, psgc] = await Promise.all([
    db
      .select({
        id: projects.id,
        abemisId: projects.abemisId,
        name: projects.name,
        status: projects.status,
        stage: projects.stage,
        region: projects.region,
        province: projects.province,
        municipality: projects.municipality,
        barangay: projects.barangay,
        psgcCode: projects.psgcCode,
        latitude: projects.latitude,
        longitude: projects.longitude,
        budget: projects.budget,
        abc: projects.abc,
        startDate: projects.startDate,
        actualCompletionDate: projects.actualCompletionDate,
        bannerProgram: projects.bannerProgram,
        yearFunded: projects.yearFunded,
        projectType: projects.projectType,
        beneficiary: projects.beneficiary,
        recipientType: projects.recipientType,
        commodities: projects.commodities,
      })
      .from(projects)
      .where(inPublicYearRange()),
    loadPsgcNames(),
  ]);

  const now = new Date();
  const publicRows: PublicProject[] = [];
  for (const row of rows) {
    const stage = getPublicStage(row.status, row.stage);
    if (!stage) continue;
    const projectType = normalizeProjectType(row.projectType);
    const places = row.psgcCode ? psgc.get(row.psgcCode.trim()) : undefined;
    const { finish } = cleanStartAndFinish(row.startDate, row.actualCompletionDate, now);
    const validLocation = isValidMapLocation(row.latitude, row.longitude);
    const farmerGroup = isFarmerGroup(row.recipientType) ? row.beneficiary?.trim().toLowerCase() || null : null;
    publicRows.push({
      id: row.id,
      code: row.abemisId,
      name: row.name.trim(),
      stage,
      category: getFacilityCategory(projectType),
      projectType,
      program: normalizeBannerProgram(row.bannerProgram),
      region: row.region?.trim() || null,
      province: row.province?.trim() || null,
      municipality: places?.municipality ?? repairPlaceName(row.municipality),
      barangay: places?.barangay ?? repairPlaceName(row.barangay),
      year: parseBudgetYear(row.yearFunded),
      budget: cleanBudget(row.budget, row.abc),
      latitude: validLocation ? row.latitude : null,
      longitude: validLocation ? row.longitude : null,
      recipientType: row.recipientType?.trim() || null,
      farmerGroupKey: farmerGroup,
      commodities: Array.isArray(row.commodities)
        ? row.commodities.filter((value): value is string => typeof value === "string" && value.trim() !== "").map((value) => value.trim())
        : [],
      finishedYear: (stage === "handed_over" || stage === "turnover") && finish ? finish.getUTCFullYear() : null,
    });
  }

  return { version, checkedAt: Date.now(), rows: publicRows, dataAsOf };
}

/**
 * All public projects with the data rules applied. Held in memory and rebuilt when the
 * project table changes (a new ABEMIS sync updates last_synced_at).
 */
export async function getPublicProjectSnapshot(): Promise<Snapshot> {
  if (snapshot && Date.now() - snapshot.checkedAt < VERSION_CHECK_INTERVAL_MS) return snapshot;
  if (loading) return loading;

  loading = (async () => {
    try {
      const { version, dataAsOf } = await readVersion();
      if (snapshot && snapshot.version === version) {
        snapshot = { ...snapshot, checkedAt: Date.now() };
        return snapshot;
      }
      snapshot = await loadSnapshot(version, dataAsOf);
      return snapshot;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

const ISO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The public view of one project, or null when it does not exist or is a proposal. */
export async function getPublicProjectDetail(id: string) {
  const identity = ISO_UUID.test(id)
    ? or(eq(projects.id, id), eq(projects.abemisId, id), eq(projects.projectCode, id))
    : or(eq(projects.abemisId, id), eq(projects.projectCode, id));
  const [row] = await db
    .select()
    .from(projects)
    .where(and(identity, inPublicYearRange()))
    .limit(1);
  if (!row) return null;

  const stage = getPublicStage(row.status, row.stage);
  if (!stage) return null;

  let municipality = repairPlaceName(row.municipality);
  let barangay = repairPlaceName(row.barangay);
  if (row.psgcCode) {
    const [place] = await db
      .select({ municipality: psgcLocations.municipalityName, barangay: psgcLocations.barangayName })
      .from(psgcLocations)
      .where(or(eq(psgcLocations.geoCode, row.psgcCode.trim()), eq(psgcLocations.geoCode1, row.psgcCode.trim())))
      .limit(1);
    if (place?.municipality) municipality = place.municipality.trim();
    if (place?.barangay) barangay = place.barangay.trim();
  }

  const now = new Date();
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const { start, finish } = cleanStartAndFinish(row.startDate, row.actualCompletionDate, now);
  const handedOver = cleanDate(row.dateTurnOver, now);
  const validLocation = isValidMapLocation(row.latitude, row.longitude);
  const projectType = normalizeProjectType(row.projectType);
  const progress = Math.min(Math.max(row.physicalProgress ?? 0, 0), 100);

  return {
    id: row.id,
    code: row.abemisId,
    name: row.name.trim(),
    description: row.description?.trim() || null,
    stage,
    projectType,
    category: getFacilityCategory(projectType),
    program: normalizeBannerProgram(row.bannerProgram),
    region: row.region?.trim() || null,
    province: row.province?.trim() || null,
    municipality,
    barangay,
    latitude: validLocation ? row.latitude : null,
    longitude: validLocation ? row.longitude : null,
    beneficiary: publicBeneficiary(row.beneficiary, row.recipientType),
    recipientType: row.recipientType?.trim() || null,
    budget: cleanBudget(row.budget, row.abc),
    contractBudget: row.abc !== null && row.abc > 0 ? row.abc : null,
    contractor: cleanContractor(row.contractorName),
    year: parseBudgetYear(row.yearFunded),
    progress,
    timeline: {
      start: start?.toISOString() ?? null,
      target: cleanDate(row.targetCompletionDate, now)?.toISOString() ?? null,
      finished: finish?.toISOString() ?? null,
      handedOver: handedOver?.toISOString() ?? null,
    },
    plannedVsActual: stage === "construction" ? buildPlannedVsActual(metadata.powRelation) : null,
    photos: orderPublicPhotos(metadata.geotag ?? metadata.geotags),
    commodities: Array.isArray(row.commodities)
      ? row.commodities.filter((value): value is string => typeof value === "string" && value.trim() !== "")
      : [],
    farmOperation: row.farmOperation?.trim() || null,
  };
}

export type PublicProjectDetail = NonNullable<Awaited<ReturnType<typeof getPublicProjectDetail>>>;

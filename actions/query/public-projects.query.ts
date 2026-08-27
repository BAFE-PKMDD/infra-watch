"use server";

import { db } from "@/lib/db";
import { feedback, projects } from "@/lib/db/schema";
import { asc, desc, and, ilike, or, eq, count, gte, inArray, lte, sql } from "drizzle-orm";
import { mapInternalToPublicStage, mapPublicToInternalStages } from "@/constants/stage-mapping";
import { isPhilippineCoordinatePair, PHILIPPINE_COORDINATE_BOUNDS } from "@/lib/philippine-coordinates";
import type { PublicProjectSort } from "@/lib/public-project-directory";
import { calculateProjectPassportCoverage, formatPublicSyncDate } from "@/lib/project-passport";
import { formatPublicProjectRecord } from "@/lib/public-project-record";
import {
  sanitizePublicProjectMetadata,
  sanitizePublicSourceGeotags,
} from "@/lib/public-source-media";
import { getLastSuccessfulProjectSyncAt } from "@/lib/public-sync";

export type PublicProjectFilters = {
  searchQuery?: string;
  program?: string;
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  status?: string;
  year?: string;
  pageParam?: number;
  sort?: PublicProjectSort;
};


export async function getPublicProjects({
  searchQuery,
  program,
  region,
  province,
  municipality,
  barangay,
  status,
  year,
  pageParam = 1,
  sort = "newest",
}: PublicProjectFilters) {
  try {
    const limit = 20;
    const offset = (pageParam - 1) * limit;

    const conditions = [];

    if (searchQuery) {
      const search = `%${searchQuery}%`;
      conditions.push(or(ilike(projects.name, search), ilike(projects.abemisId, search), ilike(projects.projectCode, search), ilike(projects.contractorName, search)));
    }
    
    if (program && program !== "all") {
      conditions.push(ilike(projects.program, program));
    }

    // Location filters - match against psgcCode prefix using most specific filter
    if (barangay && barangay !== "all") {
      conditions.push(ilike(projects.psgcCode, `${barangay}%`));
    } else if (municipality && municipality !== "all") {
      conditions.push(ilike(projects.psgcCode, `${municipality}%`));
    } else if (province && province !== "all") {
      conditions.push(ilike(projects.psgcCode, `${province}%`));
    } else if (region && region !== "all") {
      conditions.push(ilike(projects.psgcCode, `${region}%`));
    }

    if (status && status !== "all") {
      const internalStages = mapPublicToInternalStages(status);
      if (internalStages.length > 0) {
        const lowerStages = internalStages.map(s => s.toLowerCase());
        conditions.push(inArray(sql`lower(${projects.status})`, lowerStages));
      } else {
        conditions.push(eq(sql`lower(${projects.status})`, status.toLowerCase()));
      }
    }

    if (year && year !== "all") {
      conditions.push(eq(projects.yearFunded, year));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy = sort === "name-asc"
      ? [asc(projects.name), asc(projects.id)]
      : sort === "budget-desc"
        ? [sql`${projects.budget} desc nulls last`, desc(projects.id)]
        : sort === "budget-asc"
          ? [sql`${projects.budget} asc nulls last`, asc(projects.id)]
          : sort === "year-desc"
            ? [sql`${projects.yearFunded} desc nulls last`, desc(projects.lastSyncedAt), desc(projects.id)]
            : [desc(projects.lastSyncedAt), desc(projects.id)];

    const rows = await db.select()
      .from(projects)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const [[{ value: totalCount }], lastSuccessfulSync] = await Promise.all([
      db
        .select({ value: count() })
        .from(projects)
        .where(whereClause),
      getLastSuccessfulProjectSyncAt(),
    ]);
      
    const formattedData = rows.map(formatPublicProjectRecord);

    return {
      data: formattedData,
      nextCursor: rows.length === limit ? pageParam + 1 : undefined,
      totalCount,
      source: {
        name: "ABEMIS infrastructure project feed",
        lastSuccessfulSync: lastSuccessfulSync ? formatPublicSyncDate(new Date(lastSuccessfulSync)) : null,
      },
    };
  } catch (error) {
    console.error("Failed to fetch public projects:", error);
    throw error;
  }
}

export async function getPublicMapPins({
  searchQuery,
  program,
  region,
  province,
  municipality,
  barangay,
  status,
  year
}: PublicProjectFilters) {
  try {
    const conditions = [];

    if (searchQuery) {
      const search = `%${searchQuery}%`;
      conditions.push(or(ilike(projects.name, search), ilike(projects.abemisId, search), ilike(projects.projectCode, search), ilike(projects.contractorName, search)));
    }
    
    if (program && program !== "all") {
      conditions.push(ilike(projects.program, program));
    }

    if (barangay && barangay !== "all") {
      conditions.push(ilike(projects.psgcCode, `${barangay}%`));
    } else if (municipality && municipality !== "all") {
      conditions.push(ilike(projects.psgcCode, `${municipality}%`));
    } else if (province && province !== "all") {
      conditions.push(ilike(projects.psgcCode, `${province}%`));
    } else if (region && region !== "all") {
      conditions.push(ilike(projects.psgcCode, `${region}%`));
    }

    if (status && status !== "all") {
      const internalStages = mapPublicToInternalStages(status);
      if (internalStages.length > 0) {
        const lowerStages = internalStages.map(s => s.toLowerCase());
        conditions.push(inArray(sql`lower(${projects.status})`, lowerStages));
      } else {
        conditions.push(eq(sql`lower(${projects.status})`, status.toLowerCase()));
      }
    }

    if (year && year !== "all") {
      conditions.push(eq(projects.yearFunded, year));
    }

    conditions.push(
      gte(projects.latitude, PHILIPPINE_COORDINATE_BOUNDS.minLatitude),
      lte(projects.latitude, PHILIPPINE_COORDINATE_BOUNDS.maxLatitude),
      gte(projects.longitude, PHILIPPINE_COORDINATE_BOUNDS.minLongitude),
      lte(projects.longitude, PHILIPPINE_COORDINATE_BOUNDS.maxLongitude),
    );
    const whereClause = and(...conditions);

    const rows = await db.select({
      id: projects.id,
      abemisId: projects.abemisId,
      projectCode: projects.projectCode,
      name: projects.name,
      program: projects.program,
      projectType: projects.projectType,
      municipality: projects.municipality,
      barangay: projects.barangay,
      status: projects.status,
      physicalProgress: projects.physicalProgress,
      latitude: projects.latitude,
      longitude: projects.longitude
    })
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.lastSyncedAt));

    return rows.map(row => ({
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      program: row.program?.toLowerCase() || "unclassified",
      projectType: row.projectType?.trim() || "Unclassified",
      municipality: row.municipality,
      barangay: row.barangay,
      physicalProgress: row.physicalProgress || 0,
      status: row.status.toLowerCase(),
      latitude: row.latitude,
      longitude: row.longitude
    }));
  } catch (error) {
    console.error("Failed to fetch map pins:", error);
    throw error;
  }
}

export async function getPublicMapProjectDetails(id: string) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const condition = isUuid
      ? or(eq(projects.abemisId, id), eq(projects.projectCode, id), eq(projects.id, id))
      : or(eq(projects.abemisId, id), eq(projects.projectCode, id));

    const [row] = await db.select({
      id: projects.id,
      abemisId: projects.abemisId,
      projectCode: projects.projectCode,
      name: projects.name,
      program: projects.program,
      region: projects.region,
      province: projects.province,
      municipality: projects.municipality,
      barangay: projects.barangay,
      budget: projects.budget,
      status: projects.status,
      quantity: projects.quantity,
      quantityUnit: projects.quantityUnit,
      metadata: projects.metadata,
    }).from(projects).where(condition).limit(1);

    if (!row) return null;
    const sourceMetadata = (row.metadata as Record<string, unknown> | null) || {};
    const publicGeotags = sanitizePublicSourceGeotags(sourceMetadata.geotag ?? sourceMetadata.geotags);
    return {
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      program: row.program?.toLowerCase() || "unclassified",
      region: row.region,
      province: row.province,
      municipality: row.municipality,
      barangay: row.barangay,
      budget: row.budget === null ? null : Number(row.budget),
      status: row.status.toLowerCase(),
      quantity: row.quantity || null,
      quantityUnit: row.quantityUnit || null,
      metadata: {
        geotag: publicGeotags,
        geotags: publicGeotags,
      },
    };
  } catch (error) {
    console.error("Failed to fetch map project details:", error);
    throw error;
  }
}

export async function getPublicProjectById(id: string) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const condition = isUuid 
      ? or(eq(projects.abemisId, id), eq(projects.projectCode, id), eq(projects.id, id))
      : or(eq(projects.abemisId, id), eq(projects.projectCode, id));

    const [row] = await db
      .select()
      .from(projects)
      .where(condition)
      .limit(1);

    if (!row) return null;

    const [[{ value: feedbackCount }], lastSuccessfulSyncAt] = await Promise.all([
      row.abemisId
        ? db
          .select({ value: count() })
          .from(feedback)
          .where(and(eq(feedback.projectId, row.abemisId), eq(feedback.status, "approved")))
        : Promise.resolve([{ value: 0 }]),
      getLastSuccessfulProjectSyncAt(),
    ]);

    // We parse metadata or provide empty defaults for the rich UI
    const metadata = (row.metadata as Record<string, unknown> | null) || {};
    const publicGeotags = sanitizePublicSourceGeotags(metadata.geotag ?? metadata.geotags);

    const hasVerifiedCoordinates = isPhilippineCoordinatePair(row.latitude, row.longitude);
    const coordinates = hasVerifiedCoordinates ? `${row.latitude}, ${row.longitude}` : undefined;
    const locationParts = [row.barangay ? `Brgy. ${row.barangay}` : null, row.municipality, row.province]
      .filter((value): value is string => Boolean(value));
    const dataCoverage = calculateProjectPassportCoverage([
      row.projectCode || row.abemisId,
      row.name,
      row.status,
      row.region,
      row.province,
      row.municipality,
      row.budget,
      row.implementingAgency,
      row.startDate,
      coordinates,
    ]);

    return {
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      code: row.projectCode || row.abemisId || row.id,
      location: locationParts.length > 0 ? locationParts.join(", ") : "Location unavailable",
      region: row.region || undefined,
      province: row.province || undefined,
      city: row.municipality || undefined,
      barangay: row.barangay || undefined,
      implementingAgency: row.implementingAgency || row.program || "Unavailable",
      budget: row.budget === null ? null : Number(row.budget),
      abc: row.abc,
      startDate: row.startDate ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(row.startDate) : "Unavailable",
      duration: row.calendarDays ? `${row.calendarDays} days` : "Unavailable",
      calendarDays: row.calendarDays || undefined,
      status: row.status.toLowerCase(),
      stage: mapInternalToPublicStage(row.status),
      yearFunded: row.yearFunded || "Unavailable",
      contractor: row.contractorName || "Unavailable",
      scope: row.projectType,
      projectType: row.projectType,
      projectLength: row.proposedLength ? `${row.proposedLength} ${row.quantityUnit || ""}`.trim() : "Unavailable",
      postGeotaggedLength: row.postGeotaggedLength || undefined,
      description: row.description || "No description was provided by the source.",
      progress: {
        physical: row.physicalProgress || 0,
        financial: row.financialProgress || 0,
      },
      photos: publicGeotags
        .map((tag) => typeof tag.url === "string" ? tag.url : undefined)
        .filter((url): url is string => Boolean(url)),
      updates: [],
      completionDate: row.targetCompletionDate ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(row.targetCompletionDate) : "Unavailable",
      actualCompletionDate: row.actualCompletionDate
        ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(row.actualCompletionDate)
        : undefined,
      feedbackCount,
      coordinates,
      coordinateStatus: hasVerifiedCoordinates ? "verified" : "unavailable",
      sourceAgency: "ABEMIS",
      sourceSystem: "ABEMIS infrastructure project feed",
      lastSyncedAt: lastSuccessfulSyncAt
        ? formatPublicSyncDate(lastSuccessfulSyncAt)
        : "Unavailable",
      dataCoverage,
      operatingUnit: row.operatingUnit || undefined,
      bannerProgram: row.bannerProgram || undefined,
      subProgram: row.subProgram || undefined,
      prexcProgram: row.prexcProgram || undefined,
      procurementMode: row.procurementMode || undefined,
      implementationType: row.implementationType || undefined,
      quantity: row.quantity || undefined,
      quantityUnit: row.quantityUnit || undefined,
      recipientType: row.recipientType || undefined,
      indicatorLevel1: row.indicatorLevel1 || undefined,
      indicatorLevel3: row.indicatorLevel3 || undefined,
      dateTurnOver: row.dateTurnOver || undefined,
      commodities: row.commodities,
      metadata: sanitizePublicProjectMetadata(metadata, {
        physicalProgress: row.physicalProgress || 0,
        financialProgress: row.financialProgress || 0,
        calendarDays: row.calendarDays,
        coordinates,
      }),
    };
  } catch (error) {
    console.error("Failed to fetch project by id:", error);
    throw error;
  }
}

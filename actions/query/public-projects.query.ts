"use server";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc, and, ilike, or, eq, count, inArray, sql } from "drizzle-orm";
import { mapPublicToInternalStages } from "@/constants/stage-mapping";

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
  pageParam = 1
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

    const rows = await db.select()
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.lastSyncedAt))
      .limit(limit)
      .offset(offset);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(projects)
      .where(whereClause);
      
    const formattedData = rows.map(row => ({
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      program: row.program?.toLowerCase() || "ins",
      sector: row.projectType || "Infrastructure",
      region: row.region || "R8",
      province: row.province || "Unknown",
      municipality: row.municipality || "Unknown",
      barangay: row.barangay || "Unknown",
      budget: row.budget ? Number(row.budget) : 0,
      physicalProgress: row.physicalProgress || 0,
      financialProgress: row.financialProgress || 0,
      status: row.status?.toLowerCase() || "ongoing",
      contractor: row.contractorName || "Unknown Contractor",
      year: row.yearFunded || "2024"
    }));

    return {
      data: formattedData,
      nextCursor: rows.length === limit ? pageParam + 1 : undefined,
      totalCount,
    };
  } catch (error) {
    console.error("Failed to fetch public projects:", error);
    return { data: [], nextCursor: undefined, totalCount: 0 };
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select({
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
      contractorName: projects.contractorName,
      physicalProgress: projects.physicalProgress,
      latitude: projects.latitude,
      longitude: projects.longitude,
      proposedLength: projects.proposedLength,
      quantity: projects.quantity,
      quantityUnit: projects.quantityUnit,
      metadata: projects.metadata
    })
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.lastSyncedAt))
      .limit(1500);

    return rows.map(row => ({
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      program: row.program?.toLowerCase() || "ins",
      region: row.region || "R8",
      province: row.province || "Unknown",
      municipality: row.municipality || "Unknown",
      barangay: row.barangay || "Unknown",
      budget: row.budget ? Number(row.budget) : 0,
      physicalProgress: row.physicalProgress || 0,
      status: row.status?.toLowerCase() || "ongoing",
      contractor: row.contractorName || "Unknown Contractor",
      latitude: row.latitude,
      longitude: row.longitude,
      proposedLength: row.proposedLength || null,
      quantity: row.quantity || null,
      quantityUnit: row.quantityUnit || null,
      metadata: row.metadata || {}
    }));
  } catch (error) {
    console.error("Failed to fetch map pins:", error);
    return [];
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

    // We parse metadata or provide empty defaults for the rich UI
    const metadata = (row.metadata as any) || {};

    const coordinates = row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : undefined;

    return {
      id: row.abemisId || row.projectCode || row.id,
      name: row.name,
      code: row.projectCode || row.abemisId || row.id,
      location: `Brgy. ${row.barangay || "Unknown"}, ${row.municipality || "Unknown"}, ${row.province || "Unknown"}`,
      implementingAgency: row.implementingAgency || row.program || "BAFE",
      budget: row.budget ? Number(row.budget) : 0,
      startDate: row.startDate ? new Date(row.startDate).toLocaleDateString() : (row.yearFunded || "Unknown"),
      duration: row.calendarDays ? `${row.calendarDays} Days` : "120 Days",
      status: row.status?.toLowerCase() || "ongoing",
      stage: row.stage || row.status?.toUpperCase() || "ONGOING",
      yearFunded: row.yearFunded || "Unknown",
      contractor: row.contractorName || "Unknown Contractor",
      scope: row.projectType || "Infrastructure",
      projectLength: row.proposedLength ? `${row.proposedLength} ${row.quantityUnit || ""}`.trim() : "N/A",
      description: row.description || "No description provided.",
      progress: {
        physical: row.physicalProgress || 0,
        financial: row.financialProgress || 0,
      },
      photos: Array.isArray(metadata.geotag) 
        ? metadata.geotag.map((tag: any) => tag?.photo_url || tag?.url).filter(Boolean)
        : [],
      updates: [],
      completionDate: row.targetCompletionDate ? new Date(row.targetCompletionDate).toLocaleDateString() : "Unknown",
      feedbackCount: 0,
      coordinates,
      metadata: {
        ...metadata,
        physicalProgress: row.physicalProgress || 0,
        financialProgress: row.financialProgress || 0,
        calendarDays: 120,
        powRelation: metadata.powRelation || metadata.pow_relation || [],
        procurementRelation: metadata.procurementRelation || metadata.procurement_relation || [],
        geotag: metadata.geotag || metadata.geotags || [],
        coordinates,
      }
    };
  } catch (error) {
    console.error("Failed to fetch project by id:", error);
    return null;
  }
}

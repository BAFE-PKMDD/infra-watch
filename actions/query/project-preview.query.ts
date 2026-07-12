"use server";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import type { ProjectDetail } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function formatDate(value: Date | null, fallback = "Unknown") {
  if (!value) return fallback;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function locationFromProject(project: {
  barangay: string | null;
  municipality: string | null;
  province: string | null;
}) {
  return [project.barangay, project.municipality, project.province]
    .filter(Boolean)
    .join(", ") || "Location unavailable";
}

export async function getProjectPreview(
  projectId: string,
): Promise<{ success: true; data: ProjectDetail | null }> {
  const condition = UUID_RE.test(projectId)
    ? or(
      eq(projects.id, projectId),
      eq(projects.abemisId, projectId),
      eq(projects.projectCode, projectId),
    )
    : or(
      eq(projects.abemisId, projectId),
      eq(projects.projectCode, projectId),
    );

  const [row] = await db
    .select()
    .from(projects)
    .where(condition)
    .limit(1);

  if (!row) {
    return {
      success: true,
      data: null,
    };
  }

  const metadata = (row.metadata as Record<string, any> | null) ?? {};
  const projectIdForUrl = row.abemisId || row.projectCode || row.id;
  const projectLength = row.proposedLength
    ? `${row.proposedLength}${row.quantityUnit ? ` ${row.quantityUnit}` : ""}`
    : row.quantity
      ? `${row.quantity}${row.quantityUnit ? ` ${row.quantityUnit}` : ""}`
      : "N/A";

  return {
    success: true,
    data: {
      id: projectIdForUrl,
      name: row.name,
      code: row.projectCode || row.abemisId || row.id,
      location: locationFromProject(row),
      region: row.region || undefined,
      province: row.province || undefined,
      city: row.municipality || undefined,
      implementingAgency: row.implementingAgency || row.operatingUnit || row.program || "BAFE",
      budget: row.budget ? Number(row.budget) : Number(row.abc ?? 0),
      startDate: formatDate(row.startDate, row.yearFunded || "Unknown"),
      duration: row.calendarDays ? `${row.calendarDays} days` : "N/A",
      status: row.status,
      stage: row.stage || row.status,
      yearFunded: row.yearFunded || undefined,
      completionDate: formatDate(row.targetCompletionDate),
      actualCompletionDate: row.actualCompletionDate ? formatDate(row.actualCompletionDate) : undefined,
      contractor: row.contractorName || "N/A",
      scope: row.projectType || "Infrastructure",
      projectLength,
      postGeotaggedLength: row.postGeotaggedLength || undefined,
      description: row.description || "No project description available.",
      updates: [],
      coordinates: row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : undefined,
      abc: row.abc ?? undefined,
      commodities: row.commodities ?? [],
      metadata: {
        ...metadata,
        geotag: metadata.geotag || metadata.geotags || [],
      },
      feedbackCount: 0,
    },
  };
}

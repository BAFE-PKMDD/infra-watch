import type { AbemisProject } from "@/types/api.types";


function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | number | null | undefined) {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampProgress(value: number | null) {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inferProgress(project: AbemisProject, key: "actual" | "target") {
  const powRows = project.powRelation ?? [];
  if (powRows.length === 0) return 0;

  const total = powRows.reduce((sum, row) => sum + (parseNumber(row[key]) ?? 0), 0);
  return clampProgress(total);
}

function mapStatus(statusValue: string | null | undefined) {
  const status = (statusValue ?? "").toLowerCase().trim();

  if (["completed", "turned over", "turned-over"].includes(status)) return "completed";
  if (["ongoing", "on going", "under construction", "implementation"].includes(status)) return "ongoing";
  if (["suspended", "cancelled", "canceled", "terminated"].includes(status)) return "suspended";
  if (["not yet started", "planned", "for implementation", "approved"].includes(status)) return "planned";

  return status || "planned";
}

function inferProgram(project: AbemisProject) {
  const subProgram = project.sub_program ?? "";

  if (subProgram.toLowerCase().includes("irrigation")) {
    return "INS";
  }

  return "AMEFIP";
}

function inferStartDate(project: AbemisProject) {
  const ntp = project.procurementRelation?.find((row) =>
    row.milestone?.toLowerCase().includes("notice to proceed"),
  );

  return parseDate(ntp?.actual_date) ?? parseDate(project.date_turn_over);
}

function inferTargetCompletionDate(project: AbemisProject) {
  const startDate = inferStartDate(project);
  const calendarDays = parseInteger(project.calendar_days);

  if (!startDate || !calendarDays) {
    return null;
  }

  const target = new Date(startDate);
  target.setDate(target.getDate() + calendarDays);
  return target;
}

// Convert lat/long to PostGIS geometry (WKT format)
function createGeometry(latStr: string | null | undefined, lngStr: string | null | undefined) {
  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    // Return WKT (Well-Known Text) format: SRID=4326;POINT(longitude latitude)
    // Note: PostGIS uses (longitude, latitude) order for POINT
    return `SRID=4326;POINT(${lng} ${lat})`;
  }
  return null;
}

export function transformAbemisProject(project: AbemisProject) {
  const abemisId = project.project_id || project.id;
  const physicalProgress = inferProgress(project, "actual");
  const financialProgress = inferProgress(project, "target");

  return {
    abemisRawId: project.id,
    abemisId,
    projectCode: project.project_id || null,
    name: project.project_title || abemisId,
    description: project.description || null,
    status: mapStatus(project.status || project.stage),
    province: project.province || project.psgc?.province || null,
    municipality: project.municipality || project.psgc?.municipality || null,
    barangay: project.barangay || project.psgc?.barangay || null,
    latitude: parseNumber(project.latitude),
    longitude: parseNumber(project.longitude),
    budget: parseNumber(project.allocated_amount)?.toFixed(2) ?? null,
    abc: parseNumber(project.abc),
    contractAmount: parseNumber(project.abc)?.toFixed(2) ?? null,
    calendarDays: parseInteger(project.calendar_days),
    physicalProgress,
    financialProgress,
    implementingAgency: project.operating_unit || project.prexc_program || null,
    contractorName: project.contractor || null,
    startDate: inferStartDate(project),
    targetCompletionDate: inferTargetCompletionDate(project),
    actualCompletionDate: parseDate(project.date_completed || project.date_turn_over),
    operatingUnit: project.operating_unit || null,
    bannerProgram: project.banner_program || null,
    yearFunded: project.year_funded || null,
    projectType: project.project_type || "Infrastructure",
    region: project.region || project.psgc?.region || null,
    district: project.district || null,
    stage: project.stage || null,
    program: inferProgram(project),
    author: project.author || null,
    quantity: project.quantity || null,
    quantityUnit: project.quantity_unit || null,
    beneficiary: project.beneficiary || null,
    prexcProgram: project.prexc_program || null,
    subProgram: project.sub_program || null,
    indicatorLevel1: project.indicator_level1 || null,
    indicatorLevel3: project.indicator_level3 || null,
    recipientType: project.recipient_type || null,
    budgetProcess: project.budget_process || null,
    dateTurnOver: project.date_turn_over || null,
    roadClass: project.road_class || null,
    roadType: project.road_type || null,
    roadUsed: project.road_used || null,
    implementationType: project.implementation_type || null,
    proposedLength: project.proposed_length || null,
    postGeotaggedLength: project.post_geotagged_length || null,
    procurementMode: project.procurement_mode || null,
    psgcCode: project.psgc?.psgc_code || null,
    metadata: {
      geotag: project.geotag ?? [],
      proposalDocuments: project.proposalDocuments ?? project.proposal_documents ?? [],
      powRelation: project.powRelation ?? project.pow_relation ?? [],
      procurementRelation: project.procurementRelation ?? project.procurement_relation ?? [],
      kmllink: project.kmllink ?? project.kml_link,
    },
    commodities: [],
    geom: createGeometry(project.latitude, project.longitude),
  };
}

export function formatProjectLocation(project: {
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  region?: string | null;
}) {
  return [project.barangay, project.municipality, project.province, project.region].filter(Boolean).join(", ");
}

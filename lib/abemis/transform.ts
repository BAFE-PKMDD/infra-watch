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

export function transformAbemisProject(project: AbemisProject) {
  const sourceProjectId = project.project_id || project.id;
  const physicalProgress = inferProgress(project, "actual");
  const financialProgress = inferProgress(project, "target");

  return {
    sourceProjectId,
    projectCode: project.project_id || null,
    name: project.project_title || sourceProjectId,
    description: project.description || null,
    program: inferProgram(project),
    subProgram: project.sub_program || null,
    projectType: project.project_type || "Infrastructure",
    status: mapStatus(project.status || project.stage),
    stage: project.stage || null,
    region: project.region || project.psgc?.region || null,
    province: project.province || project.psgc?.province || null,
    municipality: project.municipality || project.psgc?.municipality || null,
    barangay: project.barangay || project.psgc?.barangay || null,
    latitude: parseNumber(project.latitude),
    longitude: parseNumber(project.longitude),
    budget: parseNumber(project.allocated_amount)?.toFixed(2) ?? null,
    contractAmount: parseNumber(project.abc)?.toFixed(2) ?? null,
    physicalProgress,
    financialProgress,
    implementingAgency: project.operating_unit || project.prexc_program || null,
    contractorName: project.contractor || null,
    yearFunded: project.year_funded || null,
    startDate: inferStartDate(project),
    targetCompletionDate: inferTargetCompletionDate(project),
    actualCompletionDate: parseDate(project.date_completed || project.date_turn_over),
    metadata: {
      sourceId: project.sourceId,
      author: project.author,
      bannerProgram: project.banner_program,
      prexcProgram: project.prexc_program,
      district: project.district || project.psgc?.district,
      psgc: project.psgc,
      quantity: project.quantity,
      quantityUnit: project.quantity_unit,
      beneficiary: project.beneficiary,
      indicatorLevel1: project.indicator_level1,
      indicatorLevel3: project.indicator_level3,
      recipientType: project.recipient_type,
      budgetProcess: project.budget_process,
      calendarDays: parseInteger(project.calendar_days),
      geotag: project.geotag ?? [],
      proposalDocuments: project.proposalDocuments ?? [],
      powRelation: project.powRelation ?? [],
      procurementRelation: project.procurementRelation ?? [],
      kmllink: project.kmllink,
      raw: project,
    },
  };
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

export function formatProjectLocation(project: {
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  region?: string | null;
}) {
  return [project.barangay, project.municipality, project.province, project.region].filter(Boolean).join(", ");
}

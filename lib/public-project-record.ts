import { mapInternalToPublicStage } from "@/constants/stage-mapping";

export type PublicProjectRecord = {
  id: string;
  abemisId: string | null;
  projectCode: string | null;
  name: string;
  program: string | null;
  projectType: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  budget: string | null;
  physicalProgress: number;
  financialProgress: number;
  status: string;
  stage: string | null;
  implementingAgency: string | null;
  contractorName: string | null;
  yearFunded: string | null;
  lastSyncedAt: Date;
};

export function formatPublicProjectRecord(row: PublicProjectRecord) {
  return {
    id: row.abemisId || row.projectCode || row.id,
    name: row.name,
    code: row.projectCode || row.abemisId || row.id,
    program: row.program?.toLowerCase() || "unclassified",
    sector: row.projectType,
    region: row.region,
    province: row.province,
    municipality: row.municipality,
    barangay: row.barangay,
    budget: row.budget === null ? null : Number(row.budget),
    physicalProgress: row.physicalProgress,
    financialProgress: row.financialProgress,
    status: row.status.toLowerCase(),
    stage: mapInternalToPublicStage(row.status),
    implementingAgency: row.implementingAgency,
    contractor: row.contractorName,
    year: row.yearFunded,
    lastSyncedAt: row.lastSyncedAt,
  };
}

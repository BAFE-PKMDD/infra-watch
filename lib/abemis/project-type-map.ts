import infrastructureCategorization from "./infrastructure-categorization.json";

export interface ProjectTypeMapping {
  proposedProjectType: string;
  farmOperation: string;
  applicableCommodities: string[];
}

/**
 * Normalizes an ABEMIS project_type value into a join key: case, accent, and
 * dash-variant differences (e.g. "Green-house" vs "Greenhouse") must not
 * cause a mapping miss.
 */
export function normalizeProjectType(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-‐-―]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PROJECT_TYPE_MAP = new Map<string, ProjectTypeMapping>(
  (infrastructureCategorization as Array<{
    abemisProjectType: string;
    proposedProjectType: string;
    farmOperation: string;
    applicableCommodities: string[];
  }>).map((entry) => [
    normalizeProjectType(entry.abemisProjectType),
    {
      proposedProjectType: entry.proposedProjectType,
      farmOperation: entry.farmOperation,
      applicableCommodities: entry.applicableCommodities,
    },
  ]),
);

/**
 * Looks up the standardized infrastructure category for a raw ABEMIS
 * project_type, sourced from the APSAM infrastructure categorization
 * reference (Proposed Project Type / Farm Operation / Applicable Commodity).
 * Returns null when the raw type has no entry in that reference.
 */
export function getProjectTypeMapping(rawProjectType: string | null | undefined): ProjectTypeMapping | null {
  const key = normalizeProjectType(rawProjectType);
  if (!key) return null;
  return PROJECT_TYPE_MAP.get(key) ?? null;
}

/** The full set of Farm Operation categories from the APSAM reference sheet, for building a picker. */
export const FARM_OPERATIONS: string[] = [
  ...new Set(Array.from(PROJECT_TYPE_MAP.values(), (entry) => entry.farmOperation)),
].sort((a, b) => a.localeCompare(b));

/**
 * The standardized Project Types that fall under a given Farm Operation,
 * for cascading a Project Type picker off a chosen Farm Operation.
 */
export function getProjectTypesForFarmOperation(farmOperation: string): string[] {
  const types = new Set<string>();
  for (const entry of PROJECT_TYPE_MAP.values()) {
    if (entry.farmOperation === farmOperation) types.add(entry.proposedProjectType);
  }
  return [...types].sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all standardized project types across all farm operations.
 */
export function getAllProjectTypes(): string[] {
  const types = new Set<string>();
  for (const entry of PROJECT_TYPE_MAP.values()) {
    types.add(entry.proposedProjectType);
  }
  return [...types].sort((a, b) => a.localeCompare(b));
}

/**
 * Constants and helpers for mapping internal project stages to public-facing status terms.
 */

export const PUBLIC_STAGES = [
  "Not yet started",
  "On going",
  "Completed",
] as const;

export type PublicStage = (typeof PUBLIC_STAGES)[number];

export const STAGE_MAPPING: Record<string, PublicStage> = {
  // ABEMIS (FMRDP) stages
  "Proposal": "Not yet started",
  "Pre-implementation": "Not yet started",
  "Procurement": "Not yet started",
  "Implementation": "On going",
  "Completed": "Completed",
  "Inventory": "Completed",
  // MIADP statuses
  "Ongoing": "On going",
  "Not yet started": "Not yet started",
  "Pre-Implementation": "Not yet started",
  "Incomplete Documents": "Not yet started", // Add this here to handle the user's previously missing status
  "Planned": "Not yet started",
  "Suspended": "On going",
  "Under-Procurement": "Not yet started",
  "Proposal Validated": "Not yet started",
  "Implementation-ready with recommendations": "Not yet started",
  "Implementation-ready": "Not yet started",
  "For Review": "Not yet started",
};

/**
 * Maps an internal database stage string to a public-facing status term.
 */
export function mapInternalToPublicStage(stage?: string | null): PublicStage {
  if (!stage) return "Not yet started";
  const found = Object.keys(STAGE_MAPPING).find(key => key.toLowerCase() === stage.toLowerCase());
  if (found) return STAGE_MAPPING[found];

  // Fallback heuristic for unmapped statuses
  const lowerStage = stage.toLowerCase();
  if (lowerStage.includes("complete") || lowerStage.includes("done")) return "Completed";
  if (lowerStage.includes("ongoing") || lowerStage.includes("progress") || (lowerStage.includes("implementation") && !lowerStage.includes("ready") && !lowerStage.includes("pre"))) return "On going";
  
  return "Not yet started";
}

/**
 * Maps a public-facing stage term to a list of internal database stage strings.
 */
export function mapPublicToInternalStages(publicStage: string): string[] {
  return Object.entries(STAGE_MAPPING)
    .filter(([_, value]) => value === publicStage)
    .map(([key, _]) => key);
}

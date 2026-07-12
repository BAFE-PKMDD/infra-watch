/**
 * InfraWatch program scopes used for moderator assignment.
 * These map to the projects.program values in the ABEMIS read model.
 */
export const IMPLEMENTING_AGENCIES = [
  "AMEFIP",
  "INS",
] as const;

export type ImplementingAgency = (typeof IMPLEMENTING_AGENCIES)[number];

/**
 * Display labels for each implementing agency.
 */
export const AGENCY_LABELS: Record<ImplementingAgency, string> = {
  AMEFIP: "Agricultural Machinery, Equipment, Facilities, and Infrastructures Program",
  INS: "Irrigation Network Services",
};

/**
 * Logo image paths for each implementing agency.
 * Add new entries here when onboarding a new agency.
 */
export const AGENCY_LOGOS: Record<string, string> = {
  AMEFIP: "/bafe-logo.png",
  INS: "/bafe-logo.png",
};

/** Default logo when an agency has no specific logo. */
const DEFAULT_AGENCY_LOGO = "/bafe-logo.png";

/**
 * Resolve the logo path for a given agency.
 * Falls back to the default logo if the agency is unknown or has no logo.
 */
export function getAgencyLogo(sourceAgency?: string | null): string {
  if (!sourceAgency) return DEFAULT_AGENCY_LOGO;
  return AGENCY_LOGOS[sourceAgency] ?? DEFAULT_AGENCY_LOGO;
}

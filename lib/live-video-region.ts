import { PHILIPPINE_REGIONS } from "@/lib/philippines-regions";

export function normalizeVideoRegion(value?: string | null): string | null {
  const input = value?.trim().toUpperCase();
  if (!input) return null;
  if (["NATIONAL CAPITAL REGION", "METRO MANILA", "PH130000000", "130000000"].includes(input)) return "NCR";
  return PHILIPPINE_REGIONS.find((region) =>
    [region.code, region.shortLabel, region.displayName].some((label) => label.toUpperCase() === input),
  )?.code ?? null;
}

export function canSelectVideoRegion(userRegion?: string | null) {
  return !userRegion?.trim() || normalizeVideoRegion(userRegion) === "NCR";
}

export function resolveVideoRegion(userRegion: string | null | undefined, selectedRegion: string | null | undefined) {
  const region = normalizeVideoRegion(canSelectVideoRegion(userRegion) ? selectedRegion : userRegion);
  if (!region) throw new Error("Please select a valid region for this video.");
  return region;
}

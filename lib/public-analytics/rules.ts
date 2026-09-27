/**
 * Public data rules for the ABEMIS infrastructure analytics page and public project page.
 * Every public total, chart, map pin, list row and CSV export is derived through these
 * functions so they always agree with each other.
 */

export const PUBLIC_STAGES = ["bidding", "construction", "on_hold", "turnover", "handed_over"] as const;
export type PublicStageKey = (typeof PUBLIC_STAGES)[number];

export const FACILITY_CATEGORIES = [
  "irrigation",
  "production",
  "livestock",
  "drying",
  "storage",
  "processing",
  "foodscape",
  "offices",
  "other",
] as const;
export type FacilityCategoryKey = (typeof FACILITY_CATEGORIES)[number];

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/**
 * Rule 1. Returns the public stage, or null for proposals, which are excluded everywhere.
 */
export function getPublicStage(status: string | null | undefined, stage: string | null | undefined): PublicStageKey | null {
  const s = norm(status);
  const st = norm(stage);

  if (s === "suspended") return "on_hold";
  if (s === "completed") return "handed_over";
  if (s === "for turn-over") return "turnover";
  if (s === "ongoing" || s === "under-construction" || st === "implementation") return "construction";
  if (st === "procurement") return "bidding";
  return null;
}

export const BUDGET_UPPER_LIMIT = 1_000_000_000;
export const BUDGET_TO_ABC_MAX_RATIO = 20;

/** Rule 2. Returns the usable budget in pesos, or null when it is a known typing error. */
export function cleanBudget(budget: number | string | null | undefined, abc: number | string | null | undefined): number | null {
  const value = budget === null || budget === undefined || budget === "" ? NaN : Number(budget);
  if (!Number.isFinite(value) || value <= 0 || value >= BUDGET_UPPER_LIMIT) return null;
  const contract = abc === null || abc === undefined || abc === "" ? NaN : Number(abc);
  if (Number.isFinite(contract) && contract > 0 && value / contract > BUDGET_TO_ABC_MAX_RATIO) return null;
  return value;
}

/** Rule 3. Returns the date only when its year is plausible. */
export function cleanDate(value: Date | string | null | undefined, now = new Date()): Date | null {
  if (value === null || value === undefined || value === "") return null;
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    // Parse "YYYY-MM-DD..." directly so years like "0022" are not reinterpreted.
    const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
    date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : new Date(value);
    if (match) date.setUTCFullYear(Number(match[1]));
  }
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > now.getUTCFullYear() + 1) return null;
  return date;
}

/** Rule 3 (cont.). A finish date before the start date makes both unknown. */
export function cleanStartAndFinish(
  start: Date | string | null | undefined,
  finish: Date | string | null | undefined,
  now = new Date(),
): { start: Date | null; finish: Date | null } {
  const cleanStart = cleanDate(start, now);
  const cleanFinish = cleanDate(finish, now);
  if (cleanStart && cleanFinish && cleanFinish.getTime() < cleanStart.getTime()) {
    return { start: null, finish: null };
  }
  return { start: cleanStart, finish: cleanFinish };
}

/** Rule 4. Philippine bounding box. */
export function isValidMapLocation(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  return latitude >= 4.2 && latitude <= 21.5 && longitude >= 116 && longitude <= 127.5;
}

const PROJECT_TYPE_ALIASES: Record<string, string> = {
  "rainshelter": "Rain Shelter",
  "multi-purpose drying pavement (mpdp)": "Multi-Purpose Drying Pavement",
  "nursery": "Crops Nursery",
  "nursery establishment": "Crops Nursery",
  "seed storage": "Seed Storage Facility",
  "vermi composting": "Vermi-Composting Facilities",
  "foodscaping": "Foodscape",
  "small water impounding system": "Small Water Impounding Project",
  "sprinkler irrigation": "Sprinkler Irrigation System",
  "layer house": "Layer Housing for Layer Production",
  "broiler housing": "Broiler Housing for Broiler Production",
  "feed mill": "Feed Mill Center",
  "feed mill facility": "Feed Mill Center",
  "indoor cultivation system": "Indoor Cultivation System",
};

/** Rule 5. Merges duplicate spellings of the same project type. */
export function normalizeProjectType(projectType: string | null | undefined): string {
  const trimmed = (projectType ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "Unspecified";
  return PROJECT_TYPE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

const CATEGORY_PATTERNS: Array<[FacilityCategoryKey, RegExp]> = [
  ["irrigation", /irrigat|dam|spring|water|reservoir|tube well|pisos|cistern|fertigation|wind pump|ram pump|canal|swip/],
  ["production", /greenhouse|rain ?shelter|nursery|screenhouse|shadehouse|indoor cultivation|hydroponic|tunnel|mushroom|fruiting|vertical farm|tissue culture/],
  ["livestock", /livestock|swine|chicken|cattle|goat|sheep|duck|carabao|rabbit|layer|broiler|hatchery|slaughter|milking|feedlot|ranch|poultry|quarantine|auction|silage/],
  ["drying", /drying|dryer|palay shed|shed house|post ?harvest|vtcppc|papag|silo|dehydration|hanger/],
  ["storage", /storage|warehouse|cold|zero energy|refrigeration|monolithic|ice making|buying station/],
  ["processing", /processing|mill|fermentation|roasting|packinghouse|dressing|vinegar|jam|juice|chips|flour|concoction|fertilizer|biogas|compost/],
  ["foodscape", /foodscape|gulayan|garden|edible landscape|urban agri/],
  ["offices", /office|laborator|research|training|experimental|crop protection|diagnostic|farm service|workshop|machinery shed/],
];

/** Rule 6. First matching category wins. */
export function getFacilityCategory(projectType: string | null | undefined): FacilityCategoryKey {
  const type = (projectType ?? "").toLowerCase();
  for (const [key, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(type)) return key;
  }
  return "other";
}

export const OTHER_PROGRAMS = "Other programs";

/** Rule 7. */
export function normalizeBannerProgram(program: string | null | undefined): string {
  const trimmed = (program ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "not applicable") return OTHER_PROGRAMS;
  if (trimmed === "Special Agricultural Area for Development") return "Special Agricultural Area for Development (SAAD)";
  return trimmed;
}

/** Rule 8. Restores "ñ" that was stored as "?" (upper-case "Ñ" inside upper-case words). */
export function repairPlaceName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  return trimmed.replace(/\?/g, (_match, offset: number) => {
    const previous = trimmed[offset - 1] ?? "";
    const next = trimmed[offset + 1] ?? "";
    const isUpper = (char: string) => /[A-Z]/.test(char);
    return isUpper(previous) && (isUpper(next) || next === "" || !/[a-z]/.test(next)) ? "Ñ" : "ñ";
  });
}

export type PhotoCategory = "Completed Photos" | "Progress Photos" | "Validation Photos" | "Uncategorized Photos";
export type PublicPhoto = { url: string; category: PhotoCategory };

const PHOTO_ORDER: PhotoCategory[] = ["Completed Photos", "Progress Photos", "Validation Photos"];

/** Rule 10. Completed, then progress, then validation; uncategorized only as a fallback. */
export function orderPublicPhotos(geotags: unknown): PublicPhoto[] {
  if (!Array.isArray(geotags)) return [];
  const seen = new Set<string>();
  const byCategory = new Map<PhotoCategory, PublicPhoto[]>();

  for (const tag of geotags) {
    if (!tag || typeof tag !== "object") continue;
    const url = (tag as { url?: unknown }).url;
    if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) continue;
    const cleanUrl = url.trim();
    if (seen.has(cleanUrl)) continue;
    seen.add(cleanUrl);
    const rawCategory = (tag as { category?: unknown }).category;
    const category: PhotoCategory = PHOTO_ORDER.includes(rawCategory as PhotoCategory)
      ? (rawCategory as PhotoCategory)
      : "Uncategorized Photos";
    const list = byCategory.get(category) ?? [];
    list.push({ url: cleanUrl, category });
    byCategory.set(category, list);
  }

  const categorized = PHOTO_ORDER.flatMap((category) => byCategory.get(category) ?? []);
  return categorized.length > 0 ? categorized : byCategory.get("Uncategorized Photos") ?? [];
}

const CONTRACTOR_PLACEHOLDERS = new Set(["not applicable", "n/a", "na", "none", "-", "tbd"]);

/** Rule 11. */
export function cleanContractor(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (CONTRACTOR_PLACEHOLDERS.has(lower) || lower.startsWith("write here")) return null;
  return trimmed;
}

export const INDIVIDUAL_FARMER = "Individual farmer";
export const FARMER_GROUP_RECIPIENT_TYPE = "Farmers Cooperative and Associations";

/** Section 2. Individual beneficiaries are never named (Data Privacy Act). */
export function publicBeneficiary(beneficiary: string | null | undefined, recipientType: string | null | undefined): string | null {
  if (norm(recipientType) === "individual") return INDIVIDUAL_FARMER;
  const trimmed = (beneficiary ?? "").trim();
  return trimmed || null;
}

export function isFarmerGroup(recipientType: string | null | undefined) {
  return norm(recipientType) === FARMER_GROUP_RECIPIENT_TYPE.toLowerCase();
}

/** Parses a budget year such as "2023" or "FY 2023". */
export function parseBudgetYear(value: string | null | undefined): number | null {
  const match = /(\d{4})/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1990 && year <= 2100 ? year : null;
}

export type PowPoint = { date: string; target: number; actual: number };

/**
 * Planned vs actual progress from the original programme of work. Returns running totals,
 * or null when the monthly targets do not add up to roughly 100%.
 */
export function buildPlannedVsActual(powRelation: unknown): PowPoint[] | null {
  if (!Array.isArray(powRelation)) return null;
  const rows = powRelation
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .filter((row) => norm(String(row.remark ?? "")) === "original pow")
    .map((row) => ({
      date: cleanDate(String(row.date ?? "")),
      target: Number(row.target),
      actual: Number(row.actual),
    }))
    .filter((row): row is { date: Date; target: number; actual: number } => row.date !== null && Number.isFinite(row.target))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (rows.length === 0) return null;
  const targetTotal = rows.reduce((sum, row) => sum + row.target, 0);
  if (targetTotal < 95 || targetTotal > 105) return null;

  let target = 0;
  let actual = 0;
  return rows.map((row) => {
    target += row.target;
    actual += Number.isFinite(row.actual) ? row.actual : 0;
    return { date: row.date.toISOString().slice(0, 10), target: Math.round(target * 10) / 10, actual: Math.round(actual * 10) / 10 };
  });
}

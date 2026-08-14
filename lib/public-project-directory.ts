export const PUBLIC_PROJECT_PROGRAMS = ["all", "amefip", "ins"] as const;
export const PUBLIC_PROJECT_STATUSES = ["all", "not yet started", "on going", "completed"] as const;
export const PUBLIC_PROJECT_SORTS = ["newest", "name-asc", "budget-desc", "budget-asc", "year-desc"] as const;
export const PUBLIC_PROJECT_VIEWS = ["list", "grid", "map"] as const;

export type PublicProjectProgram = (typeof PUBLIC_PROJECT_PROGRAMS)[number];
export type PublicProjectStatus = (typeof PUBLIC_PROJECT_STATUSES)[number];
export type PublicProjectSort = (typeof PUBLIC_PROJECT_SORTS)[number];
export type PublicProjectView = (typeof PUBLIC_PROJECT_VIEWS)[number];

export interface PublicProjectDirectoryState {
  searchQuery: string;
  program: PublicProjectProgram;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  status: PublicProjectStatus;
  year: string;
  sort: PublicProjectSort;
  view: PublicProjectView;
}

const defaults: PublicProjectDirectoryState = {
  searchQuery: "",
  program: "all",
  region: "all",
  province: "all",
  municipality: "all",
  barangay: "all",
  status: "all",
  year: "all",
  sort: "newest",
  view: "list",
};

function enumValue<T extends string>(value: string | null, values: readonly T[], fallback: T): T {
  return value && values.includes(value as T) ? value as T : fallback;
}

function boundedValue(value: string | null, fallback = "all") {
  const normalized = value?.trim();
  return normalized && normalized.length <= 120 ? normalized : fallback;
}

export function parsePublicProjectDirectoryState(params: URLSearchParams): PublicProjectDirectoryState {
  return {
    searchQuery: boundedValue(params.get("q"), ""),
    program: enumValue(params.get("program"), PUBLIC_PROJECT_PROGRAMS, defaults.program),
    region: boundedValue(params.get("region")),
    province: boundedValue(params.get("province")),
    municipality: boundedValue(params.get("municipality")),
    barangay: boundedValue(params.get("barangay")),
    status: enumValue(params.get("status"), PUBLIC_PROJECT_STATUSES, defaults.status),
    year: /^\d{4}$/.test(params.get("year") ?? "") ? params.get("year")! : defaults.year,
    sort: enumValue(params.get("sort"), PUBLIC_PROJECT_SORTS, defaults.sort),
    view: enumValue(params.get("view"), PUBLIC_PROJECT_VIEWS, defaults.view),
  };
}

export function serializePublicProjectDirectoryState(state: PublicProjectDirectoryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.searchQuery) params.set("q", state.searchQuery);
  if (state.program !== defaults.program) params.set("program", state.program);
  if (state.region !== defaults.region) params.set("region", state.region);
  if (state.province !== defaults.province) params.set("province", state.province);
  if (state.municipality !== defaults.municipality) params.set("municipality", state.municipality);
  if (state.barangay !== defaults.barangay) params.set("barangay", state.barangay);
  if (state.status !== defaults.status) params.set("status", state.status);
  if (state.year !== defaults.year) params.set("year", state.year);
  if (state.sort !== defaults.sort) params.set("sort", state.sort);
  if (state.view !== defaults.view) params.set("view", state.view);
  return params;
}

export function safeProjectsReturnHref(value: string | null) {
  if (value === "/projects" || value?.startsWith("/projects?")) return value;
  return "/projects";
}

export function publicProjectDirectoryDefaults(): PublicProjectDirectoryState {
  return { ...defaults };
}

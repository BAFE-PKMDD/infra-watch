import {
  FACILITY_CATEGORIES,
  OTHER_PROGRAMS,
  PUBLIC_STAGES,
  type FacilityCategoryKey,
  type PublicStageKey,
} from "./rules";

/** One public (non-proposal) project after every data rule has been applied. */
export type PublicProject = {
  id: string;
  code: string;
  name: string;
  stage: PublicStageKey;
  category: FacilityCategoryKey;
  projectType: string;
  program: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  year: number | null;
  budget: number | null;
  latitude: number | null;
  longitude: number | null;
  recipientType: string | null;
  farmerGroupKey: string | null;
  commodities: string[];
  finishedYear: number | null;
};

export type PublicFilters = {
  region?: string | null;
  province?: string | null;
  municipality?: string | null;
  year?: number | null;
  category?: FacilityCategoryKey | null;
};

export const FIRST_CHART_YEAR = 2010;

export function parseFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): PublicFilters {
  const get = (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return single && single.trim() ? single.trim().slice(0, 200) : null;
  };
  const year = Number.parseInt(get("year") ?? "", 10);
  const category = get("category");
  return {
    region: get("region"),
    province: get("province"),
    municipality: get("municipality"),
    year: Number.isInteger(year) ? year : null,
    category: category && (FACILITY_CATEGORIES as readonly string[]).includes(category) ? (category as FacilityCategoryKey) : null,
  };
}

export function filtersToSearchParams(filters: PublicFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.province) params.set("province", filters.province);
  if (filters.municipality) params.set("municipality", filters.municipality);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.category) params.set("category", filters.category);
  return params;
}

export function applyFilters(rows: PublicProject[], filters: PublicFilters): PublicProject[] {
  return rows.filter((row) =>
    (!filters.region || row.region === filters.region) &&
    (!filters.province || row.province === filters.province) &&
    (!filters.municipality || row.municipality === filters.municipality) &&
    (!filters.year || row.year === filters.year) &&
    (!filters.category || row.category === filters.category),
  );
}

const sum = (values: Array<number | null>) => values.reduce<number>((total, value) => total + (value ?? 0), 0);

function sortedCountMap<K extends string>(map: Map<K, { projects: number; pesos: number }>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.pesos - a.pesos || b.projects - a.projects || a.label.localeCompare(b.label));
}

function groupBy(rows: PublicProject[], key: (row: PublicProject) => string | null) {
  const map = new Map<string, { projects: number; pesos: number }>();
  for (const row of rows) {
    const label = key(row);
    if (!label) continue;
    const entry = map.get(label) ?? { projects: 0, pesos: 0 };
    entry.projects += 1;
    entry.pesos += row.budget ?? 0;
    map.set(label, entry);
  }
  return map;
}

export function summarize(rows: PublicProject[]) {
  const farmerGroups = new Set<string>();
  const provinces = new Set<string>();
  let finished = 0;
  for (const row of rows) {
    if (row.farmerGroupKey) farmerGroups.add(row.farmerGroupKey);
    if (row.province) provinces.add(row.province);
    if (row.stage === "handed_over" || row.stage === "turnover") finished += 1;
  }
  return {
    projects: rows.length,
    investment: sum(rows.map((row) => row.budget)),
    projectsWithBudget: rows.filter((row) => row.budget !== null).length,
    finished,
    farmerGroups: farmerGroups.size,
    provinces: provinces.size,
  };
}

/** Groups by the next level down from the active location filter. */
export function byArea(rows: PublicProject[], filters: PublicFilters) {
  const level: "region" | "province" | "municipality" = filters.province ? "municipality" : filters.region ? "province" : "region";
  const key = (row: PublicProject) => (level === "region" ? row.region : level === "province" ? row.province : row.municipality);
  return { level, rows: sortedCountMap(groupBy(rows, key)) };
}

export function byYear(rows: PublicProject[], now = new Date(), firstYear = FIRST_CHART_YEAR) {
  const lastYear = now.getFullYear();
  const map = groupBy(rows, (row) => (row.year !== null && row.year >= firstYear && row.year <= lastYear ? String(row.year) : null));
  const result = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    const entry = map.get(String(year)) ?? { projects: 0, pesos: 0 };
    result.push({ label: String(year), ...entry });
  }
  return result;
}

export function byCategory(rows: PublicProject[], topTypes = 5) {
  return FACILITY_CATEGORIES.map((category) => {
    const inCategory = rows.filter((row) => row.category === category);
    const types = sortedCountMap(groupBy(inCategory, (row) => row.projectType))
      .sort((a, b) => b.projects - a.projects || a.label.localeCompare(b.label))
      .slice(0, topTypes);
    return { label: category, projects: inCategory.length, pesos: sum(inCategory.map((row) => row.budget)), topTypes: types };
  }).sort((a, b) => b.projects - a.projects);
}

export function byProgram(rows: PublicProject[], top = 8) {
  const all = sortedCountMap(groupBy(rows, (row) => row.program)).sort((a, b) => b.projects - a.projects);
  const named = all.filter((row) => row.label !== OTHER_PROGRAMS);
  const kept = named.slice(0, top);
  const rest = [...named.slice(top), ...all.filter((row) => row.label === OTHER_PROGRAMS)];
  if (rest.length > 0) {
    kept.push({
      label: OTHER_PROGRAMS,
      projects: rest.reduce((total, row) => total + row.projects, 0),
      pesos: rest.reduce((total, row) => total + row.pesos, 0),
    });
  }
  return kept;
}

export function byStage(rows: PublicProject[]) {
  const counts = Object.fromEntries(PUBLIC_STAGES.map((stage) => [stage, 0])) as Record<PublicStageKey, number>;
  for (const row of rows) counts[row.stage] += 1;
  return PUBLIC_STAGES.map((stage) => ({ label: stage, projects: counts[stage] }));
}

export function byRecipient(rows: PublicProject[]) {
  return sortedCountMap(groupBy(rows, (row) => row.recipientType ?? "Not recorded"))
    .sort((a, b) => b.projects - a.projects);
}

export function byCommodity(rows: PublicProject[], top = 15) {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const commodity of new Set(row.commodities)) {
      map.set(commodity, (map.get(commodity) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([label, projects]) => ({ label, projects }))
    .sort((a, b) => b.projects - a.projects || a.label.localeCompare(b.label))
    .slice(0, top);
}

export const FACILITY_TILES = [
  { key: "solarIrrigation", pattern: /solar/i, also: /irrigat|pump/i },
  { key: "greenhouses", pattern: /greenhouse/i },
  { key: "dryingPavements", pattern: /drying pavement/i },
  { key: "warehouses", pattern: /warehouse/i },
  { key: "diversionDams", pattern: /diversion dam/i },
] as const;

export type FacilityTileKey = (typeof FACILITY_TILES)[number]["key"];

export function facilityTiles(rows: PublicProject[]) {
  return FACILITY_TILES.map((tile) => ({
    key: tile.key as FacilityTileKey,
    projects: rows.filter((row) => tile.pattern.test(row.projectType) && (!("also" in tile) || tile.also.test(row.projectType))).length,
  }));
}

export function finishedPerYear(rows: PublicProject[], now = new Date(), firstYear = FIRST_CHART_YEAR) {
  const lastYear = now.getFullYear();
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.finishedYear !== null && row.finishedYear >= firstYear && row.finishedYear <= lastYear) {
      counts.set(row.finishedYear, (counts.get(row.finishedYear) ?? 0) + 1);
    }
  }
  const result = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    result.push({ label: String(year), projects: counts.get(year) ?? 0 });
  }
  return result;
}

/** Options for the cascading filters, each narrowed by the levels above it. */
export function filterOptions(rows: PublicProject[], filters: PublicFilters) {
  const distinct = (values: Array<string | number | null>) =>
    Array.from(new Set(values.filter((value): value is string | number => value !== null && value !== "")));
  const inRegion = filters.region ? rows.filter((row) => row.region === filters.region) : rows;
  const inProvince = filters.province ? inRegion.filter((row) => row.province === filters.province) : inRegion;
  return {
    regions: distinct(rows.map((row) => row.region)).map(String).sort(),
    provinces: distinct(inRegion.map((row) => row.province)).map(String).sort(),
    municipalities: distinct(inProvince.map((row) => row.municipality)).map(String).sort(),
    years: distinct(rows.map((row) => row.year)).map(Number).sort((a, b) => b - a),
  };
}

/** Pins carry only what the map needs: [id, latitude, longitude, stage index, category index]. */
export type MapPoint = [string, number, number, number, number];

export function mapPoints(rows: PublicProject[]): MapPoint[] {
  const points: MapPoint[] = [];
  for (const row of rows) {
    if (row.latitude === null || row.longitude === null) continue;
    points.push([
      row.id,
      Math.round(row.latitude * 1e5) / 1e5,
      Math.round(row.longitude * 1e5) / 1e5,
      PUBLIC_STAGES.indexOf(row.stage),
      FACILITY_CATEGORIES.indexOf(row.category),
    ]);
  }
  return points;
}

/** Places matching a search, centred on the average of their mapped projects. */
export function searchPlaces(rows: PublicProject[], query: string, limit = 8) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const places = new Map<string, { label: string; kind: "province" | "municipality" | "barangay"; lat: number; lng: number; mapped: number; projects: number }>();
  const add = (kind: "province" | "municipality" | "barangay", label: string, row: PublicProject) => {
    const key = `${kind}:${label}`;
    const entry = places.get(key) ?? { label, kind, lat: 0, lng: 0, mapped: 0, projects: 0 };
    entry.projects += 1;
    if (row.latitude !== null && row.longitude !== null) {
      entry.lat += row.latitude;
      entry.lng += row.longitude;
      entry.mapped += 1;
    }
    places.set(key, entry);
  };
  for (const row of rows) {
    if (row.province?.toLowerCase().includes(needle)) add("province", row.province, row);
    if (row.municipality?.toLowerCase().includes(needle)) add("municipality", [row.municipality, row.province].filter(Boolean).join(", "), row);
    if (row.barangay?.toLowerCase().includes(needle)) add("barangay", [row.barangay, row.municipality, row.province].filter(Boolean).join(", "), row);
  }
  const kindOrder = { province: 0, municipality: 1, barangay: 2 };
  return Array.from(places.values())
    .filter((place) => place.mapped > 0)
    .map((place) => ({ label: place.label, kind: place.kind, projects: place.projects, lat: place.lat / place.mapped, lng: place.lng / place.mapped }))
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || b.projects - a.projects)
    .slice(0, limit);
}

export const LIST_SORT_KEYS = ["name", "projectType", "municipality", "province", "year", "stage", "budget"] as const;
export type ListSortKey = (typeof LIST_SORT_KEYS)[number];

export function listProjects(
  rows: PublicProject[],
  options: { query?: string | null; sort?: string | null; direction?: string | null; page?: number; pageSize?: number },
) {
  const needle = options.query?.trim().toLowerCase() ?? "";
  const matched = needle
    ? rows.filter((row) =>
        [row.name, row.code, row.projectType, row.barangay, row.municipality, row.province]
          .some((value) => value?.toLowerCase().includes(needle)))
    : rows;
  const sortKey: ListSortKey = (LIST_SORT_KEYS as readonly string[]).includes(options.sort ?? "") ? (options.sort as ListSortKey) : "year";
  const direction = options.direction === "asc" ? 1 : -1;
  const value = (row: PublicProject) => (sortKey === "stage" ? PUBLIC_STAGES.indexOf(row.stage) : row[sortKey]);
  const sorted = [...matched].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === right) return a.name.localeCompare(b.name);
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right))) * direction;
  });
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
  return {
    total: sorted.length,
    page,
    pageSize,
    totalPages,
    sort: sortKey,
    direction: direction === 1 ? "asc" : "desc",
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    all: sorted,
  };
}

const CSV_COLUMNS: Array<[string, (row: PublicProject, stageLabel: (stage: PublicStageKey) => string) => string | number | null]> = [
  ["Project ID", (row) => row.code],
  ["Name", (row) => row.name],
  ["Facility type", (row) => row.projectType],
  ["Barangay", (row) => row.barangay],
  ["Municipality", (row) => row.municipality],
  ["Province", (row) => row.province],
  ["Region", (row) => row.region],
  ["Budget year", (row) => row.year],
  ["Stage", (row, stageLabel) => stageLabel(row.stage)],
  ["Budget (PHP)", (row) => (row.budget === null ? null : row.budget.toFixed(2))],
  ["Program", (row) => row.program],
];

function csvCell(value: string | number | null) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: PublicProject[], stageLabel: (stage: PublicStageKey) => string) {
  const lines = [CSV_COLUMNS.map(([header]) => header).join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(row, stageLabel))).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

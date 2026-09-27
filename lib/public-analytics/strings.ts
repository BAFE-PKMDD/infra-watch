import type { FacilityCategoryKey, PublicStageKey } from "./rules";
import type { FacilityTileKey } from "./aggregate";

/**
 * Every user-facing string on the public analytics and project pages. Add a "tl" entry
 * with the same shape to offer a Filipino toggle.
 */
export const publicAnalyticsStrings = {
  en: {
    page: {
      title: "Farm infrastructure built with public funds",
      intro: "See what BAFE has built for farmers and fishers, how much it cost, and whether it is finished. Proposals that have not been approved for bidding are not included.",
      dataAsOf: "Data as of {date}",
      noData: "No project data is available yet. Numbers will appear after the next update from ABEMIS.",
      unavailable: "Project numbers are temporarily unavailable. Please try again later.",
      noMatch: "No projects match these filters.",
      clearFilters: "Clear filters",
    },
    filters: {
      label: "Filter projects",
      region: "Region",
      province: "Province",
      municipality: "Municipality",
      year: "Budget year",
      category: "Facility type",
      all: "All",
      apply: "Apply",
    },
    headline: {
      projects: "Projects",
      investment: "Total investment",
      investmentNote: "{count} projects have a usable budget",
      finished: "Finished facilities",
      farmerGroups: "Farmer groups served",
      provinces: "Provinces reached",
    },
    map: {
      title: "Find projects near you",
      description: "Each pin is a project with a recorded location. Zoom in to separate grouped pins.",
      searchLabel: "Search a province, municipality or barangay",
      searchPlaceholder: "e.g. Muñoz, Nueva Ecija",
      noPlaces: "No mapped projects in that place.",
      legend: "Stage",
      notMapped: "{count} of these projects have no usable location and are only in the list below.",
      openProject: "Open project page",
      loading: "Loading project…",
      loadFailed: "Could not load this project.",
      mapLabel: "Map of project locations",
      photoAlt: "Photo of {name}",
    },
    area: {
      titleRegion: "How much was invested in each region?",
      titleProvince: "How much was invested in each province?",
      titleMunicipality: "How much was invested in each municipality?",
      pesos: "Pesos",
      projects: "Number of projects",
      showAll: "Show all {count}",
      showFewer: "Show fewer",
    },
    year: {
      title: "How many projects were funded each budget year?",
    },
    category: {
      title: "What kinds of facilities are being built?",
      hint: "Select a category to see its most common facility types.",
      topTypes: "Most common in {category}",
    },
    program: {
      title: "Which programs paid for them?",
    },
    stage: {
      title: "Where are the projects now?",
    },
    recipient: {
      title: "Who benefits?",
      farmerGroups: "farmer groups received a facility",
    },
    commodity: {
      title: "Which crops and livestock do they support?",
      empty: "No crops or livestock are recorded for these projects.",
    },
    tiles: {
      title: "What these facilities do",
      note: "Counts include facilities that are finished or still being built.",
    },
    finished: {
      title: "How many facilities were finished each year?",
      note: "Based on the recorded finish date. {count} finished facilities have no usable finish date.",
    },
    list: {
      title: "All projects",
      searchLabel: "Search by project name, type or place",
      download: "Download CSV",
      columns: {
        name: "Project",
        projectType: "Type",
        municipality: "Municipality",
        province: "Province",
        year: "Budget year",
        stage: "Stage",
        budget: "Budget",
      },
      sortBy: "Sort by {column}",
      page: "Page {page} of {total}",
      previous: "Previous",
      next: "Next",
      showing: "{count} projects",
      empty: "No projects match your search.",
      loading: "Loading projects…",
    },
    chart: {
      viewTable: "View as table",
      hideTable: "Hide table",
      measure: "Show",
      pesos: "Pesos",
      projects: "Projects",
      noBudget: "No usable budget",
      emptyChart: "Nothing to show for these filters.",
      tableLabel: "Label",
      tableProjects: "Projects",
      tablePesos: "Budget (₱)",
      outOf: "{part} out of every 100",
    },
    howWeCount: {
      title: "How we count",
      body: [
        "We only count projects that have reached bidding or later. Proposals still being reviewed are left out of every number, chart, map and list on this page.",
        "Budgets that are clearly typing errors (zero, ₱1 billion or more, or over 20 times the contract budget) are left out of peso totals, but the project is still counted. Dates before 2000 or in the far future are treated as unknown.",
        "A project appears on the map only if its recorded location is inside the Philippines. Projects without a usable location are still counted and listed.",
      ],
    },
    stages: {
      bidding: "Bidding",
      construction: "Under construction",
      on_hold: "On hold",
      turnover: "Finished, waiting for turn-over",
      handed_over: "Finished & handed over",
    } satisfies Record<PublicStageKey, string>,
    categories: {
      irrigation: "Irrigation & Water",
      production: "Production Facilities",
      livestock: "Livestock & Poultry",
      drying: "Drying & Post-harvest",
      storage: "Storage & Cold Chain",
      processing: "Processing Centers",
      foodscape: "Foodscape & Gardens",
      offices: "Offices, Labs & Research",
      other: "Markets, Roads & Others",
    } satisfies Record<FacilityCategoryKey, string>,
    facilityTiles: {
      solarIrrigation: "solar irrigation systems",
      greenhouses: "greenhouses",
      dryingPavements: "drying pavements",
      warehouses: "warehouses",
      diversionDams: "diversion dams",
    } satisfies Record<FacilityTileKey, string>,
    project: {
      back: "Back to all projects",
      notFound: "Project not found",
      notFoundBody: "This project is not available. It may still be a proposal, or the link may be wrong.",
      type: "Facility type",
      location: "Location",
      beneficiary: "Beneficiary",
      budget: "Budget",
      contractBudget: "Contract budget",
      contractor: "Contractor",
      budgetYear: "Budget year",
      program: "Program",
      stage: "Stage",
      notRecorded: "Not recorded",
      progressTitle: "How far along is it?",
      progressLabel: "{value} out of 100 of the work done",
      timelineTitle: "Timeline",
      timeline: {
        start: "Start date",
        target: "Target finish",
        finished: "Finished",
        handedOver: "Handed over to the beneficiaries",
      },
      timelineEmpty: "No usable dates are recorded for this project.",
      plannedVsActual: "Planned vs actual progress",
      planned: "Planned",
      actual: "Actual",
      plannedVsActualNote: "Running total of the monthly work planned at the start and the work actually done.",
      photosTitle: "Photos",
      noPhotos: "No photos have been uploaded for this project.",
      mapTitle: "Where is it?",
      noLocation: "This project has no usable map location.",
      photoCategory: {
        "Completed Photos": "Finished",
        "Progress Photos": "During construction",
        "Validation Photos": "Site check",
        "Uncategorized Photos": "Photo",
      },
      commodities: "Crops and livestock supported",
    },
  },
} as const;

export type PublicAnalyticsStrings = (typeof publicAnalyticsStrings)["en"];

export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

const pesoFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });
const countFormatter = new Intl.NumberFormat("en-PH");

export function formatCount(value: number) {
  return countFormatter.format(value);
}

/** ₱30.0B, ₱412.5M, ₱85K, or the full amount below ₱1,000. */
export function formatPesosShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `₱${Math.round(value / 1e3)}K`;
  return `₱${pesoFormatter.format(value)}`;
}

export function formatPesos(value: number) {
  return `₱${pesoFormatter.format(value)}`;
}

export function formatPublicDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(date));
}

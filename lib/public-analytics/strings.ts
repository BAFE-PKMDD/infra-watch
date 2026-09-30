import type { Language } from "@/i18n/translations";

import type { FacilityCategoryKey, PhotoCategory, PublicStageKey } from "./rules";
import type { FacilityTileKey } from "./aggregate";

/**
 * Every user-facing string on the public analytics and project pages, in English and in
 * everyday Tagalog (see i18n/TAGALOG_STYLE.md). Server components pick a language with
 * getServerLanguage(); client components with usePublicAnalyticsStrings().
 *
 * Plain language on purpose: no statistics or project-control jargon in either language.
 */
const en = {
  page: {
    title: "Farm infrastructure built with public funds",
    metaDescription: "What BAFE has built for farmers and fishers, how much it cost, and whether it is finished.",
    intro: "See what BAFE has built for farmers and fishers, how much it cost, and whether it is finished. Proposals that have not been approved for bidding are not included.",
    dataAsOf: "Last updated from ABEMIS: {date}",
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
    investment: "Allocated budget",
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
    titleRegion: "How much budget was allocated to each region?",
    titleProvince: "How much budget was allocated to each province?",
    titleMunicipality: "How much budget was allocated to each municipality?",
    pesos: "Budget",
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
    title: "Which banner programs funded them?",
    other: "Other banner programs",
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
  otherMetrics: {
    title: "Other key metrics",
    description: "Facility type, program, stage, recipient, crop and finish-date breakdowns.",
  },
  list: {
    title: "All projects",
    searchLabel: "Search by project name, type or place",
    download: "Download CSV",
    scrollHint: "Scroll right to see more columns.",
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
    pesos: "Budget",
    projects: "Projects",
    noBudget: "No usable budget",
    emptyChart: "Nothing to show for these filters.",
    tableLabel: "Label",
    tableProjects: "Projects",
    tablePesos: "Budget (₱)",
    outOf: "{part} out of every 100",
    lessThanOne: "less than 1",
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
    solarIrrigation: "Solar irrigation systems",
    greenhouses: "Greenhouses",
    dryingPavements: "Drying pavements",
    warehouses: "Warehouses",
    diversionDams: "Diversion dams",
  } satisfies Record<FacilityTileKey, string>,
  project: {
    back: "Back to all projects",
    notFound: "Project not found",
    notFoundBody: "This project is not available. It may still be a proposal, or the link may be wrong.",
    type: "Facility type",
    location: "Location",
    beneficiary: "Beneficiary",
    individualFarmer: "Individual farmer",
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
    outOf100: "{value} out of 100",
    month: "Month",
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
    } satisfies Record<PhotoCategory, string>,
    photoPosition: "{category}, {position} of {total}",
    commodities: "Crops and livestock supported",
  },
} as const;

/** The shape of `en` with every string widened, so `tl` must have exactly the same keys. */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };

export type PublicAnalyticsStrings = Widen<typeof en>;

// Stage names are fixed across the page (legend, chips, list, map, project page) and must
// match the wording used in the other Tagalog strings ("ginagawa pa", "tapos na").
const tl: PublicAnalyticsStrings = {
  page: {
    title: "Mga imprastraktura sa bukid na gawa sa pondo ng bayan",
    metaDescription: "Ano ang ipinagawa ng BAFE para sa mga magsasaka at mangingisda, magkano ang nagastos, at kung tapos na ito.",
    intro: "Tingnan kung ano ang ipinagawa ng BAFE para sa mga magsasaka at mangingisda, magkano ang nagastos, at kung tapos na ito. Hindi kasama ang mga proposal na hindi pa aprubado para sa bidding.",
    dataAsOf: "Huling na-update mula sa ABEMIS: {date}",
    noData: "Wala pang project data. Lalabas ang mga numero pagkatapos ng susunod na update mula sa ABEMIS.",
    unavailable: "Hindi muna makita ang mga numero ng project. Subukan ulit mamaya.",
    noMatch: "Walang project na tugma sa mga filter na ito.",
    clearFilters: "I-clear ang mga filter",
  },
  filters: {
    label: "I-filter ang mga project",
    region: "Region",
    province: "Province",
    municipality: "Bayan",
    year: "Taon ng budget",
    category: "Uri ng pasilidad",
    all: "Lahat",
    apply: "I-apply",
  },
  headline: {
    projects: "Mga project",
    investment: "Inilaang badyet",
    investmentNote: "{count} project ang may magagamit na budget",
    finished: "Pasilidad na tapos na",
    farmerGroups: "Farmer group na natulungan",
    provinces: "Province na naabot",
  },
  map: {
    title: "Hanapin ang mga project malapit sa iyo",
    description: "Bawat pin ay isang project na may naka-record na lokasyon. Mag-zoom in para maghiwa-hiwalay ang mga pin na magkakadikit.",
    searchLabel: "Maghanap ng province, bayan o barangay",
    searchPlaceholder: "hal. Muñoz, Nueva Ecija",
    noPlaces: "Walang project sa mapa sa lugar na iyan.",
    legend: "Status",
    notMapped: "{count} sa mga project na ito ang walang magagamit na lokasyon, kaya nasa listahan lang sila sa ibaba.",
    openProject: "Buksan ang page ng project",
    loading: "Naglo-load ang project…",
    loadFailed: "Hindi ma-load ang project na ito.",
    mapLabel: "Mapa ng mga lokasyon ng project",
    photoAlt: "Litrato ng {name}",
  },
  area: {
    titleRegion: "Magkano ang inilaang badyet sa bawat region?",
    titleProvince: "Magkano ang inilaang badyet sa bawat province?",
    titleMunicipality: "Magkano ang inilaang badyet sa bawat bayan?",
    pesos: "Badyet",
    projects: "Bilang ng project",
    showAll: "Ipakita lahat ng {count}",
    showFewer: "Ipakita nang mas kaunti",
  },
  year: {
    title: "Ilang project ang napondohan bawat taon ng budget?",
  },
  category: {
    title: "Anong klaseng pasilidad ang ginagawa?",
    hint: "Pumili ng kategorya para makita ang pinakamadalas na uri ng pasilidad dito.",
    topTypes: "Pinakamadalas sa {category}",
  },
  program: {
    title: "Aling mga banner program ang nagpondo sa mga ito?",
    other: "Iba pang banner program",
  },
  stage: {
    title: "Nasaan na ang mga project ngayon?",
  },
  recipient: {
    title: "Sino ang nakikinabang?",
    farmerGroups: "farmer group ang nakatanggap ng pasilidad",
  },
  commodity: {
    title: "Anong mga pananim at hayop ang natutulungan ng mga ito?",
    empty: "Walang naka-record na pananim o hayop para sa mga project na ito.",
  },
  tiles: {
    title: "Ano ang silbi ng mga pasilidad na ito",
    note: "Kasama sa bilang ang mga pasilidad na tapos na o ginagawa pa.",
  },
  finished: {
    title: "Ilang pasilidad ang natapos bawat taon?",
    note: "Batay sa naka-record na petsa kung kailan natapos. May {count} pasilidad na tapos na pero walang magagamit na petsa.",
  },
  otherMetrics: {
    title: "Iba pang mahalagang datos",
    description: "Uri ng pasilidad, program, status, benepisyaryo, at breakdown ng petsa ng pagkatapos.",
  },
  list: {
    title: "Lahat ng project",
    searchLabel: "Maghanap ayon sa pangalan ng project, uri o lugar",
    download: "I-download ang CSV",
    scrollHint: "Mag-scroll pakanan para makita ang iba pang column.",
    columns: {
      name: "Project",
      projectType: "Uri",
      municipality: "Bayan",
      province: "Province",
      year: "Taon ng budget",
      stage: "Status",
      budget: "Budget",
    },
    sortBy: "I-sort ayon sa {column}",
    page: "Pahina {page} ng {total}",
    previous: "Nakaraan",
    next: "Susunod",
    showing: "{count} project",
    empty: "Walang project na tugma sa hinanap mo.",
    loading: "Naglo-load ang mga project…",
  },
  chart: {
    viewTable: "Tingnan bilang table",
    hideTable: "Itago ang table",
    measure: "Ipakita",
    pesos: "Badyet",
    projects: "Project",
    noBudget: "Walang magagamit na budget",
    emptyChart: "Walang maipakita para sa mga filter na ito.",
    tableLabel: "Pangalan",
    tableProjects: "Project",
    tablePesos: "Budget (₱)",
    outOf: "{part} sa bawat 100",
    lessThanOne: "mas mababa sa 1",
  },
  howWeCount: {
    title: "Paano kami nagbibilang",
    body: [
      "Binibilang lang namin ang mga project na umabot na sa bidding o lampas pa. Ang mga proposal na nire-review pa ay hindi kasama sa kahit anong numero, chart, mapa o listahan sa page na ito.",
      "Ang mga budget na halatang mali ang pagkaka-type (zero, ₱1 bilyon o higit pa, o higit sa 20 beses ng contract budget) ay hindi isinasama sa kabuuang piso, pero bilang pa rin ang project. Ang mga petsang bago mag-2000 o sobrang layo pa sa hinaharap ay tinuturing naming hindi alam.",
      "Lumalabas lang sa mapa ang isang project kung nasa loob ng Pilipinas ang naka-record na lokasyon nito. Bilang pa rin at nasa listahan pa rin ang mga project na walang magagamit na lokasyon.",
    ],
  },
  stages: {
    bidding: "Nasa bidding",
    construction: "Ginagawa pa",
    on_hold: "Naka-hold",
    turnover: "Tapos na, hinihintay ang turn-over",
    handed_over: "Tapos na at na-turn over na",
  },
  categories: {
    irrigation: "Irigasyon at Tubig",
    production: "Pasilidad sa Produksyon",
    livestock: "Hayupan at Manukan",
    drying: "Patuyuan at Post-harvest",
    storage: "Imbakan at Cold Chain",
    processing: "Mga Processing Center",
    foodscape: "Foodscape at mga Hardin",
    offices: "Opisina, Lab at Research",
    other: "Palengke, Kalsada at Iba Pa",
  },
  facilityTiles: {
    solarIrrigation: "Solar irrigation system",
    greenhouses: "Greenhouse",
    dryingPavements: "Patuyuan (drying pavement)",
    warehouses: "Bodega",
    diversionDams: "Diversion dam",
  },
  project: {
    back: "Bumalik sa lahat ng project",
    notFound: "Hindi makita ang project",
    notFoundBody: "Hindi available ang project na ito. Baka proposal pa lang ito, o mali ang link.",
    type: "Uri ng pasilidad",
    location: "Lokasyon",
    beneficiary: "Benepisyaryo",
    individualFarmer: "Indibidwal na magsasaka",
    budget: "Budget",
    contractBudget: "Budget sa kontrata",
    contractor: "Contractor",
    budgetYear: "Taon ng budget",
    program: "Program",
    stage: "Status",
    notRecorded: "Hindi naka-record",
    progressTitle: "Hanggang saan na ang trabaho?",
    progressLabel: "{value} sa 100 ng trabaho ang tapos na",
    timelineTitle: "Timeline",
    timeline: {
      start: "Petsa ng simula",
      target: "Target na matapos",
      finished: "Natapos",
      handedOver: "Na-turn over sa mga benepisyaryo",
    },
    timelineEmpty: "Walang magagamit na petsa na naka-record para sa project na ito.",
    plannedVsActual: "Plano vs aktwal na nagawa",
    planned: "Plano",
    actual: "Aktwal",
    outOf100: "{value} sa 100",
    month: "Buwan",
    plannedVsActualNote: "Kabuuan hanggang sa bawat buwan ng trabahong pinlano noong simula, at ng trabahong talagang nagawa.",
    photosTitle: "Mga litrato",
    noPhotos: "Wala pang na-upload na litrato para sa project na ito.",
    mapTitle: "Nasaan ito?",
    noLocation: "Walang magagamit na lokasyon sa mapa ang project na ito.",
    photoCategory: {
      "Completed Photos": "Tapos na",
      "Progress Photos": "Habang ginagawa",
      "Validation Photos": "Pag-check sa site",
      "Uncategorized Photos": "Litrato",
    },
    photoPosition: "{category}, {position} sa {total}",
    commodities: "Mga pananim at hayop na natutulungan",
  },
};

export const publicAnalyticsStrings: Record<Language, PublicAnalyticsStrings> = { en, tl };

/** The dictionary for `language`, falling back to English for anything unexpected. */
export function getPublicAnalyticsStrings(language: string | null | undefined): PublicAnalyticsStrings {
  return language === "tl" ? tl : en;
}

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

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Grid,
  List,
  Map as MapIcon,
  Download,
  ChevronDown,
  MapPin,
  X,
  Briefcase,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import MatrixOrb from "@/components/ui/matrix-orb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { getPublicMapPins, getPublicMapProjectDetails, getPublicProjects } from "@/actions/query/public-projects.query";
import { mapInternalToPublicStage, type PublicStage } from "@/constants/stage-mapping";
import { getRegions, getProvinces, getMunicipalities, getBarangays } from "@/actions/query/get-location-options";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isPhilippineCoordinatePair } from "@/lib/philippine-coordinates";
import { PROJECT_MARKER_LEGEND } from "@/lib/public-project-map";
import {
  parsePublicProjectDirectoryState,
  serializePublicProjectDirectoryState,
  type PublicProjectSort,
} from "@/lib/public-project-directory";
import {
  FARM_OPERATIONS,
  getAllProjectTypes,
  getProjectTypesForFarmOperation,
} from "@/lib/abemis/project-type-map";
import { safePublicSourceMediaUrl } from "@/lib/public-source-media";
import { sendCitizenEngagementEvent } from "@/lib/analytics/citizen-event-client";
import { useTranslation } from "@/i18n";
import { CitizenGuideNotice, useCitizenGuide } from "@/components/citizen/tour/citizen-guide-context";
import { CITIZEN_PROJECT_ID } from "@/lib/tours/citizen";
import { CITIZEN_DIRECTORY_PROJECTS } from "@/lib/tours/citizen-directory";

type CatalogMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  type: string;
  desc: string;
  progress: number;
};

type GeotagPhoto = {
  photo_url?: string;
  url?: string;
};

const SELECT_CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundPosition: "right 0.65rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1em 1em",
  paddingRight: "2rem",
};

function projectLocation(
  project: { barangay: string | null; municipality: string | null; province?: string | null },
  unavailableLabel: string,
) {
  return [project.barangay, project.municipality, project.province].filter(Boolean).join(", ") || unavailableLabel;
}

// Display label keys for the public stages returned by mapInternalToPublicStage. Comparisons
// (colors) keep using the English stage value; only the rendered text is translated.
const STAGE_LABEL_KEYS: Record<PublicStage, string> = {
  "Not yet started": "directory.status.notYetStarted",
  "On going": "directory.status.onGoing",
  "Completed": "directory.status.completed",
};

/**
 * Many ABEMIS project titles are near-identical, generic phrases that differ
 * only in a suffix (e.g. "...Chicken Multiplier Farm" vs "...Duck Multiplier
 * Farm"), so the standardized project type leads the display and the raw
 * title is shown underneath for full context.
 */
function projectDisplayTitle(project: { name: string; projectType: string | null }) {
  const type = project.projectType?.trim() || null;
  return {
    primary: type || project.name,
    secondary: type ? project.name : null,
  };
}

function getGeotagPhotos(metadata: unknown): GeotagPhoto[] {
  if (!metadata || typeof metadata !== "object") return [];
  const geotag = (metadata as Record<string, unknown>).geotag;
  if (!Array.isArray(geotag)) return [];
  return geotag.filter(
    (photo): photo is GeotagPhoto => Boolean(photo) && typeof photo === "object",
  );
}

const GISMapCanvas = dynamic(() => import("@/components/map/gis-map-canvas"), {
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-slate-50 dark:bg-slate-900"><MatrixOrb state="thinking" size={100} dots={9} hideLabel /></div>
});
export default function ProjectsCatalog() {
  const { t } = useTranslation();
  const guide = useCitizenGuide();
  const example = guide?.session?.guide === "citizen-feedback";
  const stageLabel = (status: string | null | undefined) => t(STAGE_LABEL_KEYS[mapInternalToPublicStage(status)]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const applyingUrlStateRef = React.useRef(false);
  const [initialState] = useState(() => parsePublicProjectDirectoryState(new URLSearchParams(searchParams.toString())));
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [activeProgram, setActiveProgram] = useState(initialState.program);
  const [selectedRegion, setSelectedRegion] = useState(initialState.region);
  const [selectedProvince, setSelectedProvince] = useState(initialState.province);
  const [selectedMunicipality, setSelectedMunicipality] = useState(initialState.municipality);
  const [selectedBarangay, setSelectedBarangay] = useState(initialState.barangay);
  const [selectedYear, setSelectedYear] = useState(initialState.year);
  const [selectedStatus, setSelectedStatus] = useState(initialState.status);
  const [selectedFarmOperation, setSelectedFarmOperation] = useState(initialState.farmOperation || "all");
  const [selectedProjectType, setSelectedProjectType] = useState(initialState.projectType || "all");
  const [sort, setSort] = useState<PublicProjectSort>(initialState.sort);
  const [selectedViewMode, setViewMode] = useState(initialState.view);
  const viewMode = example ? "list" : selectedViewMode;
  const { theme } = useTheme();
  const [selectedPin, setSelectedPin] = useState<CatalogMapPin | null>(null);
  const [mapProjectType, setMapProjectType] = useState("all");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapPanelRef = React.useRef<HTMLDivElement>(null);
  const trackedSearchStatesRef = React.useRef(new Set<string>());
  const mapViewTrackedRef = React.useRef(false);

  const availableProjectTypes = React.useMemo(() => {
    if (selectedFarmOperation !== "all") {
      return getProjectTypesForFarmOperation(selectedFarmOperation);
    }
    return getAllProjectTypes();
  }, [selectedFarmOperation]);

  const handleFarmOperationChange = (newFarmOp: string) => {
    setSelectedFarmOperation(newFarmOp);
    if (newFarmOp !== "all") {
      const allowed = getProjectTypesForFarmOperation(newFarmOp);
      if (selectedProjectType !== "all" && !allowed.includes(selectedProjectType)) {
        setSelectedProjectType("all");
      }
    }
  };

  const { ref, inView } = useInView();

  const { data: regionsList = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: () => getRegions(),
    staleTime: Infinity,
  });

  const { data: provincesList = [] } = useQuery({
    queryKey: ["provinces", selectedRegion],
    queryFn: () => getProvinces(selectedRegion),
    enabled: selectedRegion !== "all",
    staleTime: Infinity,
  });

  const { data: municipalitiesList = [] } = useQuery({
    queryKey: ["municipalities", selectedProvince],
    queryFn: () => getMunicipalities(selectedProvince),
    enabled: selectedProvince !== "all",
    staleTime: Infinity,
  });

  const { data: barangaysList = [] } = useQuery({
    queryKey: ["barangays", selectedMunicipality],
    queryFn: () => getBarangays(selectedMunicipality),
    enabled: selectedMunicipality !== "all",
    staleTime: Infinity,
  });

  const {
    data: queryData,
    isLoading: projectsLoading,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage: moreProjects,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["public-projects", 5, searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear, selectedFarmOperation, selectedProjectType, sort],
    queryFn: ({ pageParam = 1 }) => getPublicProjects({
      searchQuery,
      program: activeProgram,
      region: selectedRegion,
      province: selectedProvince,
      municipality: selectedMunicipality,
      barangay: selectedBarangay,
      status: selectedStatus,
      year: selectedYear,
      farmOperation: selectedFarmOperation,
      projectType: selectedProjectType,
      sort,
      pageParam
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    enabled: !example,
  });

  const {
    data: allMapPins = [],
    isLoading: isLoadingMapPins,
    isError: isMapError,
    refetch: refetchMap,
  } = useQuery({
    queryKey: ["public-map-projects", 4, searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear, selectedFarmOperation, selectedProjectType],
    queryFn: () => getPublicMapPins({
      searchQuery,
      program: activeProgram,
      region: selectedRegion,
      province: selectedProvince,
      municipality: selectedMunicipality,
      barangay: selectedBarangay,
      status: selectedStatus,
      year: selectedYear,
      farmOperation: selectedFarmOperation,
      projectType: selectedProjectType,
    }),
    enabled: !example && viewMode === "map",
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedMapProjectDetails, isLoading: isLoadingMapProjectDetails } = useQuery({
    queryKey: ["public-map-project-details", selectedPin?.id],
    queryFn: () => getPublicMapProjectDetails(selectedPin!.id),
    enabled: Boolean(selectedPin),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = !example && projectsLoading;
  const hasNextPage = !example && moreProjects;
  const filteredProjects = example ? CITIZEN_DIRECTORY_PROJECTS : queryData?.pages.flatMap((page) => page.data) || [];
  const directoryUnavailable = !example && (isError || (viewMode === "map" && isMapError));
  const totalCount = example ? CITIZEN_DIRECTORY_PROJECTS.length : queryData?.pages[0]?.totalCount || 0;
  const directoryParams = React.useMemo(() => serializePublicProjectDirectoryState({
    searchQuery,
    program: activeProgram,
    region: selectedRegion,
    province: selectedProvince,
    municipality: selectedMunicipality,
    barangay: selectedBarangay,
    status: selectedStatus,
    year: selectedYear,
    farmOperation: selectedFarmOperation,
    projectType: selectedProjectType,
    sort,
    view: viewMode,
  }), [searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear, selectedFarmOperation, selectedProjectType, sort, viewMode]);
  const directoryQueryString = directoryParams.toString();
  const directoryReturnHref = directoryQueryString ? `${pathname}?${directoryQueryString}` : pathname;
  const projectHref = (projectId: string, tab?: string) => {
    const params = new URLSearchParams({ return: directoryReturnHref });
    if (tab) params.set("tab", tab);
    return `/projects/${encodeURIComponent(projectId)}?${params.toString()}`;
  };

  const hasSearchIntent = searchQuery.trim().length >= 2
    || activeProgram !== "all"
    || selectedRegion !== "all"
    || selectedProvince !== "all"
    || selectedMunicipality !== "all"
    || selectedBarangay !== "all"
    || selectedStatus !== "all"
    || selectedYear !== "all"
    || selectedFarmOperation !== "all"
    || selectedProjectType !== "all";
  const searchIntentKey = [
    searchQuery.trim(),
    activeProgram,
    selectedRegion,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
    selectedStatus,
    selectedYear,
    selectedFarmOperation,
    selectedProjectType,
  ].join("|");

  React.useEffect(() => {
    if (example || !hasSearchIntent || isFetching || !queryData) return;
    const timer = window.setTimeout(() => {
      if (trackedSearchStatesRef.current.has(searchIntentKey)) return;
      trackedSearchStatesRef.current.add(searchIntentKey);
      void sendCitizenEngagementEvent({
        eventName: "project_search_completed",
        routeTemplate: "/projects",
        entrySurface: "directory",
        resultCount: totalCount,
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [example, hasSearchIntent, isFetching, queryData, searchIntentKey, totalCount]);

  React.useEffect(() => {
    if (example || viewMode !== "map" || mapViewTrackedRef.current) return;
    mapViewTrackedRef.current = true;
    void sendCitizenEngagementEvent({
      eventName: "map_viewed",
      routeTemplate: "/projects",
      entrySurface: "map",
    });
  }, [example, viewMode]);

  const recordSearchProjectOpen = (projectId: string) => {
    if (example || projectId === CITIZEN_PROJECT_ID || searchQuery.trim().length < 2) return;
    void sendCitizenEngagementEvent({
      eventName: "project_opened_from_search",
      routeTemplate: "/projects",
      resourceId: projectId,
      entrySurface: "search",
    });
  };

  const handleMapProjectSelection = React.useCallback((pin: CatalogMapPin | null) => {
    setSelectedPin(pin);
    if (!pin) return;
    void sendCitizenEngagementEvent({
      eventName: "map_project_opened",
      routeTemplate: "/projects",
      resourceId: pin.id,
      entrySurface: "map",
    });
  }, []);
  React.useEffect(() => {
    const syncFromHistory = () => {
      const next = parsePublicProjectDirectoryState(new URLSearchParams(window.location.search));
      applyingUrlStateRef.current = true;
      setSearchQuery(next.searchQuery);
      setActiveProgram(next.program);
      setSelectedRegion(next.region);
      setSelectedProvince(next.province);
      setSelectedMunicipality(next.municipality);
      setSelectedBarangay(next.barangay);
      setSelectedStatus(next.status);
      setSelectedYear(next.year);
      setSelectedFarmOperation(next.farmOperation);
      setSelectedProjectType(next.projectType);
      setSort(next.sort);
      setViewMode(next.view);
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  React.useEffect(() => {
    if (example) return;
    if (applyingUrlStateRef.current) {
      applyingUrlStateRef.current = false;
      return;
    }
    const nextUrl = directoryQueryString ? `${pathname}?${directoryQueryString}` : pathname;
    const currentUrl = searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
  }, [example, directoryQueryString, pathname, router, searchParamsKey]);

  // A plain string keeps the memo stable across renders (t itself is recreated every render).
  const locationUnavailableLabel = t("directory.card.locationUnavailable");
  const mapPins = React.useMemo(() => {
    return allMapPins.flatMap(p => {
      if (!isPhilippineCoordinatePair(p.latitude, p.longitude)) return [];
      return [{
        id: p.id,
        name: p.name,
        lat: p.latitude!,
        lng: p.longitude!,
        status: mapInternalToPublicStage(p.status).toLowerCase().replace(" ", ""),
        type: p.projectType,
        desc: projectLocation(p, locationUnavailableLabel),
        progress: p.physicalProgress || 0
      }];
    });
  }, [allMapPins, locationUnavailableLabel]);

  const mapProjectTypes = React.useMemo(
    () => [...new Set(mapPins.map((pin) => pin.type))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    [mapPins],
  );
  const effectiveMapProjectType = mapProjectType === "all" || mapProjectTypes.includes(mapProjectType)
    ? mapProjectType
    : "all";
  const filteredMapPins = React.useMemo(
    () => effectiveMapProjectType === "all"
      ? mapPins
      : mapPins.filter((pin) => pin.type === effectiveMapProjectType),
    [effectiveMapProjectType, mapPins],
  );

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsMapFullscreen(document.fullscreenElement === mapPanelRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleMapFullscreen = async () => {
    const mapPanel = mapPanelRef.current;
    if (!mapPanel) return;
    try {
      if (document.fullscreenElement === mapPanel) {
        await document.exitFullscreen();
      } else {
        await mapPanel.requestFullscreen();
      }
    } catch {
      setIsMapFullscreen(false);
    }
  };

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setActiveProgram("all");
    setSelectedRegion("all");
    setSelectedProvince("all");
    setSelectedMunicipality("all");
    setSelectedBarangay("all");
    setSelectedYear("all");
    setSelectedStatus("all");
    setSelectedFarmOperation("all");
    setSelectedProjectType("all");
    setMapProjectType("all");
    setSelectedPin(null);
    setSort("newest");
    setViewMode("list");
  };

  const programs = [
    { id: "all", label: t("directory.filters.allPrograms") },
    { id: "ins", label: "INS" },
    { id: "amefip", label: "AMEFIP" },
  ] as const;

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      {/* Full-width Hero Section */}
      <section className="relative w-full h-[360px] md:h-[400px] flex items-center justify-center text-center overflow-hidden">
        {/* Background Image & Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/irrigation.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1526]/90 via-[#13233c]/85 to-[#1e3a5f]/90 dark:from-[#0d1526]/95 dark:via-[#0d1526]/90 dark:to-[#1e3a5f]/95 backdrop-blur-[2px]" />

        {/* Hero Content */}
        <div className="relative z-10 px-4 flex flex-col items-center mt-[-40px]">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-lg mb-4"
          >
            INFRA WATCH
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base lg:text-lg text-white/90 font-medium max-w-2xl drop-shadow-md"
          >
            {t("directory.hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Main Content Container (Overlapping Hero) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24">

        {/* Floating Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 md:p-8 mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">{t("directory.search.title")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t("directory.search.description")}</p>

            <div className="relative w-full">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                aria-label={t("directory.search.ariaLabel")}
                placeholder={t("directory.search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-10 py-6 text-sm md:text-base focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label={t("directory.search.clear")}
                  title={t("directory.search.clear")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Unified Filter & View Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl mb-8"
        >
          {/* Header Row: Results count, sort & view switcher */}
          <div className="flex flex-col gap-4 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-base font-extrabold leading-none text-slate-900 dark:text-white">
                {t("directory.results.found", { count: totalCount.toLocaleString() })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <select
                aria-label={t("directory.sort.label")}
                value={sort}
                onChange={(event) => setSort(event.target.value as PublicProjectSort)}
                className="w-full sm:w-auto max-w-[210px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="newest">{t("directory.sort.newest")}</option>
                <option value="name-asc">{t("directory.sort.nameAsc")}</option>
                <option value="budget-desc">{t("directory.sort.budgetDesc")}</option>
                <option value="budget-asc">{t("directory.sort.budgetAsc")}</option>
                <option value="year-desc">{t("directory.sort.yearDesc")}</option>
              </select>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800" role="group" aria-label={t("directory.view.groupLabel")}>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label={t("directory.view.list")}
                  aria-pressed={viewMode === "list"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "list" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title={t("directory.view.listTitle")}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label={t("directory.view.grid")}
                  aria-pressed={viewMode === "grid"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "grid" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title={t("directory.view.gridTitle")}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  aria-label={t("directory.view.map")}
                  aria-pressed={viewMode === "map"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "map" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title={t("directory.view.mapTitle")}
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>

              <button disabled aria-label={t("directory.export.label")} className="p-2.5 rounded-lg border border-transparent text-slate-400 disabled:cursor-not-allowed disabled:opacity-60" title={t("directory.export.title")}>
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Body */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                {t("directory.filters.heading")}
              </p>
              {directoryQueryString && (
                <Button variant="outline" size="sm" onClick={resetFilters}>{t("directory.filters.resetAll")}</Button>
              )}
            </div>

            {/* Program Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {programs.map(prog => (
                <button
                  key={prog.id}
                  onClick={() => setActiveProgram(prog.id)}
                  aria-pressed={activeProgram === prog.id}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    activeProgram === prog.id
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {prog.label}
                </button>
              ))}
            </div>

            {/* Location / Classification / Status / Year Selects */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <select
                aria-label={t("directory.filters.region")}
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedProvince("all");
                  setSelectedMunicipality("all");
                  setSelectedBarangay("all");
                }}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allRegions")}</option>
                {regionsList.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.province")}
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedMunicipality("all");
                  setSelectedBarangay("all");
                }}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allProvinces")}</option>
                {provincesList.map((province) => (
                  <option key={province.value} value={province.value}>
                    {province.label}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.municipality")}
                value={selectedMunicipality}
                onChange={(e) => {
                  setSelectedMunicipality(e.target.value);
                  setSelectedBarangay("all");
                }}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allMunicipalities")}</option>
                {municipalitiesList.map((municipality) => (
                  <option key={municipality.value} value={municipality.value}>
                    {municipality.label}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.barangay")}
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allBarangays")}</option>
                {barangaysList.map((barangay) => (
                  <option key={barangay.value} value={barangay.value}>
                    {barangay.label}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.farmOperation")}
                value={selectedFarmOperation}
                onChange={(e) => handleFarmOperationChange(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allFarmOperations")}</option>
                {FARM_OPERATIONS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.projectType")}
                value={selectedProjectType}
                onChange={(e) => setSelectedProjectType(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allProjectTypes")}</option>
                {availableProjectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                aria-label={t("directory.filters.status")}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.allStatus")}</option>
                <option value="not yet started">{t("directory.status.notYetStarted")}</option>
                <option value="on going">{t("directory.status.onGoing")}</option>
                <option value="completed">{t("directory.status.completed")}</option>
              </select>

              <select
                aria-label={t("directory.filters.year")}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={SELECT_CHEVRON_STYLE}
              >
                <option value="all">{t("directory.filters.anyYear")}</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>

            {directoryQueryString && (
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {t("directory.filters.savedInUrl")}
              </p>
            )}
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-16 flex flex-col items-center justify-center"
          >
            <MatrixOrb
              state="thinking"
              size={120}
              dots={9}
              hideLabel
            />
          </motion.div>
        )}

        {/* Unavailable State */}
        {!isLoading && directoryUnavailable && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-12"
          >
            <div className="text-center flex flex-col items-center justify-center">
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300">{t("directory.unavailable.title")}</h4>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-6">
                {t("directory.unavailable.description")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void refetch();
                  if (viewMode === "map") void refetchMap();
                }}
              >
                {t("directory.unavailable.retry")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !directoryUnavailable && filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-12"
          >
            <div className="text-center flex flex-col items-center justify-center">
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300">{t("directory.empty.title")}</h4>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-6">
                {t("directory.empty.description")}
              </p>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="text-xs font-bold border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                {t("directory.empty.reset")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Project Results Display */}
        {example ? <CitizenGuideNotice /> : null}
        {!isLoading && !directoryUnavailable && filteredProjects.length > 0 && viewMode === "grid" && (
          <>
            <motion.div
              layout
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <Card className="relative bg-slate-50/30 hover:bg-white dark:bg-slate-900/30 dark:hover:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-300/80 dark:hover:border-slate-700/80 transition-all rounded-2xl overflow-hidden flex flex-col justify-between h-[320px] cursor-pointer hover:shadow-sm">
                      <Link href={projectHref(project.id)} onClick={() => recordSearchProjectOpen(project.id)} className="p-7 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Top Row: Meta & Status Dot */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider font-mono">
                              {project.program.toUpperCase()} • {project.id}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                mapInternalToPublicStage(project.status) === "Completed" ? "bg-emerald-500" :
                                mapInternalToPublicStage(project.status) === "On going" ? "bg-amber-500" :
                                "bg-slate-400"
                              }`} />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                                {stageLabel(project.status)}
                              </span>
                            </div>
                          </div>

                          {/* Project Title */}
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {project.name}
                          </h3>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t("directory.card.location")}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate block mt-0.5">{projectLocation(project, locationUnavailableLabel)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t("directory.card.allocation")}</span>
                            <span className="text-slate-900 dark:text-white font-bold block mt-0.5">{project.budget === null ? t("directory.card.notAvailable") : `₱${project.budget.toLocaleString()}`}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t("directory.card.contractor")}</span>
                            <span className="text-slate-705 dark:text-slate-300 font-semibold truncate block mt-0.5">{project.contractor || t("directory.card.notAvailable")}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t("directory.card.progress")}</span>
                            <span className="text-slate-900 dark:text-white font-bold block mt-0.5 font-mono">{project.physicalProgress}%</span>
                          </div>
                        </div>
                      </Link>

                      {/* Bottom-accent Progress bar (Safety Orange) */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-700 ease-out"
                          style={{ width: `${project.physicalProgress}%` }}
                        />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {hasNextPage && (
              <div ref={ref} className="w-full py-8 flex justify-center mt-4">
                {isFetchingNextPage && <MatrixOrb state="thinking" size={56} dots={7} hideLabel />}
              </div>
            )}
          </>
        )}

        {!isLoading && !directoryUnavailable && filteredProjects.length > 0 && viewMode === "list" && (
          <>
            <div className="space-y-3 md:hidden">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <Link data-citizen={example ? "project-view-details" : undefined} href={projectHref(project.id, "feedback")} onClick={() => recordSearchProjectOpen(project.id)} className="block p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {(() => {
                          const { primary, secondary } = projectDisplayTitle(project);
                          return (
                            <>
                              <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900 dark:text-white">{primary}</h3>
                              {secondary && (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{secondary}</p>
                              )}
                            </>
                          );
                        })()}
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{project.program} · {project.code}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {stageLabel(project.status)}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                      <div><dt className="text-slate-500">{t("directory.card.location")}</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{projectLocation(project, locationUnavailableLabel)}</dd></div>
                      <div><dt className="text-slate-500">{t("directory.card.approvedBudget")}</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{project.budget === null ? t("directory.card.notAvailable") : `₱${project.budget.toLocaleString()}`}</dd></div>
                    </dl>
                    <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">{t("directory.table.viewDetails")}</span>
                  </Link>
                </Card>
              ))}
            </div>
            <motion.div layout className="hidden md:block">
              <Card className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">{t("directory.table.nameCode")}<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">{t("directory.table.location")}<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">{t("directory.table.agency")}<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">{t("directory.table.budget")}<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">{t("directory.table.status")}<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider dark:text-slate-100">{t("directory.table.action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <AnimatePresence>
                        {filteredProjects.map((project) => (
                          <motion.tr
                            key={project.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-5">
                              <Link href={projectHref(project.id)} onClick={() => recordSearchProjectOpen(project.id)} className="block">
                                {(() => {
                                  const { primary, secondary } = projectDisplayTitle(project);
                                  return (
                                    <>
                                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 dark:text-white">{primary}</h3>
                                      {secondary && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 dark:text-slate-400">{secondary}</p>
                                      )}
                                    </>
                                  );
                                })()}
                                <p className="text-xs text-slate-500 mt-1 font-mono dark:text-slate-300">{project.program.toUpperCase()} • {project.id}</p>
                              </Link>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-700 dark:text-slate-200">{projectLocation(project, locationUnavailableLabel)}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {project.region || project.program.toUpperCase()}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {project.budget === null
                                  ? t("directory.card.notAvailable")
                                  : `₱${project.budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm text-slate-700 dark:text-slate-200 capitalize">
                                {stageLabel(project.status)}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <Button asChild className="min-h-11 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold px-4 py-2 rounded-md">
                                <Link data-citizen={example ? "project-view-details" : undefined} href={projectHref(project.id, "feedback")} onClick={() => recordSearchProjectOpen(project.id)}>{t("directory.table.viewDetails")}</Link>
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>

            {hasNextPage && (
              <div ref={ref} className="w-full py-8 flex justify-center mt-4">
                {isFetchingNextPage && <MatrixOrb state="thinking" size={56} dots={7} hideLabel />}
              </div>
            )}
          </>
        )}

        {/* Map View */}
        {viewMode === "map" && !directoryUnavailable && (
          <motion.div
            ref={mapPanelRef}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-6 flex gap-4 relative z-0 ${
              isMapFullscreen
                ? "h-screen w-screen m-0 bg-slate-950"
                : "w-full h-[600px]"
            }`}
          >
            <div
              className={`flex-1 overflow-hidden border border-slate-200 bg-slate-950 shadow-sm relative ${
                isMapFullscreen
                  ? "h-full rounded-none border-0"
                  : "h-full rounded-2xl"
              }`}
            >
              {!isLoadingMapPins && (
                <div className="absolute left-3 top-3 z-[1000] max-w-[min(20rem,calc(100%-6rem))] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                  <div>{t(filteredMapPins.length === 1 ? "directory.map.shownOne" : "directory.map.shownOther", { count: filteredMapPins.length.toLocaleString() })}</div>
                  {totalCount > filteredMapPins.length && (
                    <div className="mt-1 text-[10px] font-normal leading-snug text-slate-500 dark:text-slate-400">
                      {t("directory.map.missingCoordinates", { count: (totalCount - filteredMapPins.length).toLocaleString() })}
                    </div>
                  )}
                </div>
              )}
              {!isLoadingMapPins && (
                <div className="absolute bottom-28 right-3 z-[1000] grid w-[min(22rem,calc(100%-1.5rem))] gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-6 sm:w-[22rem]">
                  <label className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
                    <span>{t("directory.filters.region")}</span>
                    <select
                      aria-label={t("directory.map.regionAria")}
                      value={selectedRegion}
                      onChange={(event) => {
                        setSelectedRegion(event.target.value);
                        setSelectedProvince("all");
                        setSelectedMunicipality("all");
                        setSelectedBarangay("all");
                        setSelectedPin(null);
                      }}
                      className="min-w-0 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="all">{t("directory.filters.allRegions")}</option>
                      {regionsList.map((region) => (
                        <option key={region.value} value={region.value}>{region.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
                    <span>{t("directory.filters.projectType")}</span>
                    <select
                      aria-label={t("directory.filters.projectType")}
                      value={effectiveMapProjectType}
                      onChange={(event) => {
                        setMapProjectType(event.target.value);
                        setSelectedPin(null);
                      }}
                      className="min-w-0 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="all">{t("directory.map.allProjectTypes")}</option>
                      {mapProjectTypes.map((projectType) => (
                        <option key={projectType} value={projectType}>{projectType}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <button
                type="button"
                onClick={() => void toggleMapFullscreen()}
                aria-label={isMapFullscreen ? t("directory.map.exitFullscreen") : t("directory.map.enterFullscreen")}
                title={isMapFullscreen ? t("directory.map.exitFullscreenTitle") : t("directory.map.enterFullscreen")}
                className="absolute right-3 top-3 z-[1000] inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {isMapFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              {!isLoadingMapPins && (
                <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                  <p className="mb-1.5 font-bold">{t("directory.map.legendTitle")}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {PROJECT_MARKER_LEGEND.map((item) => (
                      <span key={item.key} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="h-2.5 w-2.5 rounded-full border border-slate-900" style={{ backgroundColor: item.color }} />
                        {t(`directory.status.${item.key}`)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isLoadingMapPins ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                  <MatrixOrb
                    state="thinking"
                    size={100}
                    dots={9}
                    hideLabel
                  />
                </div>
              ) : (
                <GISMapCanvas
                  filteredPins={filteredMapPins}
                  selectedProject={selectedPin}
                  setSelectedProject={handleMapProjectSelection}
                  watershedOverlay={false}
                  agriZoneOverlay={false}
                  theme={theme === "dark" ? "dark" : "light"}
                  mapCenter={[12.8797, 121.7740]}
                  mapZoom={6}
                  selectedRegion={selectedRegion}
                />
              )}
            </div>

            <AnimatePresence>
              {selectedPin && (
                <motion.div
                  initial={{ width: 0, opacity: 0, x: 20 }}
                  animate={{ width: 400, opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: 20 }}
                  className="h-full relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col shrink-0"
                >
                  {(() => {
                    if (isLoadingMapProjectDetails) {
                      return <div className="flex h-full items-center justify-center"><MatrixOrb state="thinking" size={64} dots={7} hideLabel /></div>;
                    }
                    const projectDetails = selectedMapProjectDetails;
                    if (!projectDetails) return <p className="p-5 text-sm text-slate-500">{t("directory.panel.unavailable")}</p>;
                    const geotagPhotos = getGeotagPhotos(projectDetails.metadata);
                    const firstPhotoUrl = geotagPhotos
                      .map((photo) => safePublicSourceMediaUrl(photo.photo_url || photo.url))
                      .find((url): url is string => Boolean(url)) || null;
                    return (
                      <>
                        <div className="flex-1 overflow-y-auto p-5 pb-24 relative">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="pr-2">
                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug mb-2">{projectDetails.name}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              mapInternalToPublicStage(projectDetails.status) === "Completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                              mapInternalToPublicStage(projectDetails.status) === "On going" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {stageLabel(projectDetails.status)}
                            </span>
                            <div className="mt-3 text-[10px] text-slate-500 font-mono flex items-center border-b border-slate-100/80 dark:border-slate-800 pb-3">
                              {t("directory.panel.id", { id: projectDetails.id })}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedPin(null)}
                            aria-label={t("directory.panel.close")}
                            title={t("directory.panel.close")}
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Budget Box */}
                        <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 mb-4 mt-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">₱</span>
                            {t("directory.panel.budget")}
                          </div>
                          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {projectDetails.budget === null
                              ? t("directory.panel.budgetUnavailable")
                              : `₱${projectDetails.budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("directory.panel.location")}</span>
                          </div>
                          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.region")}</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.region || t("directory.card.notAvailable")}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.province")}</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.province || t("directory.card.notAvailable")}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.municipality")}</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.municipality || t("directory.card.notAvailable")}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.barangay")}</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.barangay || t("directory.card.notAvailable")}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.gps")}</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300 text-right">{selectedPin.lat.toFixed(6)}, {selectedPin.lng.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Implementation */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("directory.panel.implementation")}</span>
                          </div>
                          <div className="p-4 text-xs flex justify-between">
                            <span className="text-slate-500">{t("directory.panel.operatingUnit")}</span>
                            <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.region || projectDetails.program.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* Project Details */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <MapIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("directory.panel.details")}</span>
                          </div>
                          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t("directory.panel.quantity")}</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">
                                {projectDetails.quantity ? `${projectDetails.quantity} ${projectDetails.quantityUnit || ""}` : t("directory.card.notAvailable")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Geotagged Photos */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              {t("directory.panel.photos", { count: geotagPhotos.length })}
                            </span>
                          </div>
                          <div className="p-4 bg-white dark:bg-slate-900">
                            {firstPhotoUrl ? (
                              <a
                                href={firstPhotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="block w-28 h-28 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                {/* Approved HTTPS source hosts only; see safePublicSourceMediaUrl. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={firstPhotoUrl}
                                  alt={t("directory.panel.photoAlt")}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ) : (
                              <p className="text-xs text-slate-500 italic">{t("directory.panel.noPhotos")}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sticky View Details Button */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10">
                        <Link href={projectHref(projectDetails.id)} className="block">
                          <Button className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-5 rounded-lg shadow-sm">
                            {t("directory.panel.viewFullDetails")} {">"}
                          </Button>
                        </Link>
                      </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

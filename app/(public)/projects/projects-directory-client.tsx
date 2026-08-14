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
  Loader2,
  Briefcase,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { getPublicMapPins, getPublicMapProjectDetails, getPublicProjects } from "@/actions/query/public-projects.query";
import { mapInternalToPublicStage } from "@/constants/stage-mapping";
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
import { safePublicSourceMediaUrl } from "@/lib/public-source-media";

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

function projectLocation(project: { barangay: string | null; municipality: string | null; province?: string | null }) {
  return [project.barangay, project.municipality, project.province].filter(Boolean).join(", ") || "Location unavailable";
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
  loading: () => <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
});
export default function ProjectsCatalog() {
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
  const [sort, setSort] = useState<PublicProjectSort>(initialState.sort);
  const [viewMode, setViewMode] = useState(initialState.view);
  const { theme } = useTheme();
  const [selectedPin, setSelectedPin] = useState<CatalogMapPin | null>(null);

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
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["public-projects", 4, searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear, sort],
    queryFn: ({ pageParam = 1 }) => getPublicProjects({
      searchQuery,
      program: activeProgram,
      region: selectedRegion,
      province: selectedProvince,
      municipality: selectedMunicipality,
      barangay: selectedBarangay,
      status: selectedStatus,
      year: selectedYear,
      sort,
      pageParam
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
  });

  const {
    data: allMapPins = [],
    isLoading: isLoadingMapPins,
    isError: isMapError,
    refetch: refetchMap,
  } = useQuery({
    queryKey: ["public-map-projects", 3, searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear],
    queryFn: () => getPublicMapPins({
      searchQuery,
      program: activeProgram,
      region: selectedRegion,
      province: selectedProvince,
      municipality: selectedMunicipality,
      barangay: selectedBarangay,
      status: selectedStatus,
      year: selectedYear
    }),
    enabled: viewMode === "map",
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedMapProjectDetails, isLoading: isLoadingMapProjectDetails } = useQuery({
    queryKey: ["public-map-project-details", selectedPin?.id],
    queryFn: () => getPublicMapProjectDetails(selectedPin!.id),
    enabled: Boolean(selectedPin),
    staleTime: 5 * 60 * 1000,
  });

  const filteredProjects = queryData?.pages.flatMap((page) => page.data) || [];
  const directoryUnavailable = isError || (viewMode === "map" && isMapError);
  const totalCount = queryData?.pages[0]?.totalCount || 0;
  const directorySource = queryData?.pages[0]?.source;
  const directoryParams = React.useMemo(() => serializePublicProjectDirectoryState({
    searchQuery,
    program: activeProgram,
    region: selectedRegion,
    province: selectedProvince,
    municipality: selectedMunicipality,
    barangay: selectedBarangay,
    status: selectedStatus,
    year: selectedYear,
    sort,
    view: viewMode,
  }), [searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear, sort, viewMode]);
  const directoryQueryString = directoryParams.toString();
  const directoryReturnHref = directoryQueryString ? `${pathname}?${directoryQueryString}` : pathname;
  const projectHref = (projectId: string, tab?: string) => {
    const params = new URLSearchParams({ return: directoryReturnHref });
    if (tab) params.set("tab", tab);
    return `/projects/${encodeURIComponent(projectId)}?${params.toString()}`;
  };
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
      setSort(next.sort);
      setViewMode(next.view);
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  React.useEffect(() => {
    if (applyingUrlStateRef.current) {
      applyingUrlStateRef.current = false;
      return;
    }
    const nextUrl = directoryQueryString ? `${pathname}?${directoryQueryString}` : pathname;
    const currentUrl = searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
  }, [directoryQueryString, pathname, router, searchParamsKey]);

  const mapPins = React.useMemo(() => {
    return allMapPins.flatMap(p => {
      if (!isPhilippineCoordinatePair(p.latitude, p.longitude)) return [];
      return [{
        id: p.id,
        name: p.name,
        lat: p.latitude!,
        lng: p.longitude!,
        status: mapInternalToPublicStage(p.status).toLowerCase().replace(" ", ""),
        type: p.program,
        desc: projectLocation(p),
        progress: p.physicalProgress || 0
      }];
    });
  }, [allMapPins]);

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
    setSort("newest");
    setViewMode("list");
  };

  const programs = [
    { id: "all", label: "All" },
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
            Monitor and validate agricultural infrastructure projects across the Philippines
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
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Search for a project</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Quickly search a project by name or code.</p>

            <div className="relative w-full">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                aria-label="Search projects by name or code"
                placeholder="Search for project name or code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-10 py-6 text-sm md:text-base focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
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
          className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-8"
        >
          {/* Top Row: Results count & Views */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
            <div className="flex items-center gap-4 text-sm font-extrabold text-slate-900 dark:text-white">
              <div>
                <span>{totalCount.toLocaleString()} projects found</span>
                <p className="mt-1 text-[10px] font-medium text-slate-500">
                  Source: {directorySource?.name || "ABEMIS infrastructure project feed"}
                  {directorySource?.lastSuccessfulSync ? ` · Last successful sync: ${directorySource.lastSuccessfulSync}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-semibold">
                <Filter className="w-4 h-4" />
                <span>Filters:</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-slate-500 font-semibold hidden sm:inline">Select a view:</span>

              <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "list" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "grid" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  aria-label="Map view"
                  aria-pressed={viewMode === "map"}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    viewMode === "map" ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-white border border-transparent"
                  }`}
                  title="Map View"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <button disabled aria-label="Export is coming soon" className="p-2.5 rounded-lg border border-transparent text-slate-400 disabled:cursor-not-allowed disabled:opacity-60" title="Export (Coming Soon)">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Pill Tabs & Selects */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Program Pills */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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

            {/* Select Dropdowns Wrapper */}
            <div className="flex-1 w-full flex flex-wrap gap-2.5">
              <p className="w-full text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filter by location, status, and funding year</p>
              <select
                aria-label="Region"
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedProvince("all");
                  setSelectedMunicipality("all");
                  setSelectedBarangay("all");
                }}
                className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">All Regions</option>
                {regionsList.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Province"
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedMunicipality("all");
                  setSelectedBarangay("all");
                }}
                className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">All Provinces</option>
                {provincesList.map((province) => (
                  <option key={province.value} value={province.value}>
                    {province.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="City or municipality"
                value={selectedMunicipality}
                onChange={(e) => {
                  setSelectedMunicipality(e.target.value);
                  setSelectedBarangay("all");
                }}
                className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">All Cities/Municipalities</option>
                {municipalitiesList.map((municipality) => (
                  <option key={municipality.value} value={municipality.value}>
                    {municipality.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Barangay"
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">All Barangays</option>
                {barangaysList.map((barangay) => (
                  <option key={barangay.value} value={barangay.value}>
                    {barangay.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Project status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">All Status</option>
                <option value="not yet started">Not yet started</option>
                <option value="on going">On going</option>
                <option value="completed">Completed</option>
              </select>

              <select
                aria-label="Funding year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-1 min-w-[80px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.8rem` }}
              >
                <option value="all">Year</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <label className="flex min-w-[170px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Sort</span>
                <select
                  aria-label="Sort projects"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as PublicProjectSort)}
                  className="min-w-0 flex-1 bg-transparent py-2 text-xs font-semibold text-slate-700 outline-none dark:text-slate-300"
                >
                  <option value="newest">Recently synchronized</option>
                  <option value="name-asc">Project name A–Z</option>
                  <option value="budget-desc">Approved budget: high to low</option>
                  <option value="budget-asc">Approved budget: low to high</option>
                  <option value="year-desc">Funding year: newest first</option>
                </select>
              </label>
            </div>
          </div>
          {directoryQueryString && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filters, sorting, and view are saved in this shareable URL.</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>Reset filters and view</Button>
            </div>
          )}
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-20 flex flex-col items-center justify-center"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Fetching synchronized projects...</p>
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
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300">Project data is temporarily unavailable</h4>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-6">
                The synchronized source could not be reached. Please try again shortly.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void refetch();
                  if (viewMode === "map") void refetchMap();
                }}
              >
                Try again
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
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300">No projects found</h4>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-6">
                Try adjusting your filters or search query
              </p>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="text-xs font-bold border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                Reset Filters
              </Button>
            </div>
          </motion.div>
        )}

        {/* Project Results Display */}
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
                      <Link href={projectHref(project.id)} className="p-7 flex-1 flex flex-col justify-between">
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
                                {mapInternalToPublicStage(project.status)}
                              </span>
                            </div>
                          </div>

                          {/* Project Title */}
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {project.name}
                          </h3>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-850 mt-4">
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Location</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate block mt-0.5">{projectLocation(project)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Allocation</span>
                            <span className="text-slate-900 dark:text-white font-bold block mt-0.5">{project.budget === null ? "Not available" : `₱${project.budget.toLocaleString()}`}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Contractor</span>
                            <span className="text-slate-705 dark:text-slate-300 font-semibold truncate block mt-0.5">{project.contractor || "Not available"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Progress</span>
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
                {isFetchingNextPage && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
              </div>
            )}
          </>
        )}

        {!isLoading && !directoryUnavailable && filteredProjects.length > 0 && viewMode === "list" && (
          <>
            <div className="space-y-3 md:hidden">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <Link href={projectHref(project.id)} className="block p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{project.program} · {project.code}</p>
                        <h3 className="mt-2 line-clamp-2 text-sm font-extrabold text-slate-900 dark:text-white">{project.name}</h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {mapInternalToPublicStage(project.status)}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                      <div><dt className="text-slate-500">Location</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{projectLocation(project)}</dd></div>
                      <div><dt className="text-slate-500">Approved budget</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{project.budget === null ? "Not available" : `₱${project.budget.toLocaleString()}`}</dd></div>
                    </dl>
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
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">PROJECT NAME/CODE<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">LOCATION<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">IMPLEMENTING AGENCY<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">BUDGET (PHP)<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-primary transition-colors dark:text-slate-100">STATUS<ChevronDown className="w-4 h-4" /></button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider dark:text-slate-100">ACTION</th>
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
                              <Link href={projectHref(project.id)} className="block">
                                <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors line-clamp-2 dark:text-white">{project.name}</h3>
                                <p className="text-xs text-slate-500 mt-1 font-mono dark:text-slate-300">{project.program.toUpperCase()} • {project.id}</p>
                              </Link>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-700 dark:text-slate-200">{projectLocation(project)}</p>
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
                                  ? "Not available"
                                  : `₱${project.budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm text-slate-700 dark:text-slate-200 capitalize">
                                {mapInternalToPublicStage(project.status)}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <Link href={projectHref(project.id, "feedback")} className="inline-block">
                                <Button className="bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold px-4 py-2 rounded-md">View details</Button>
                              </Link>
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
                {isFetchingNextPage && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
              </div>
            )}
          </>
        )}

        {/* Map View */}
        {viewMode === "map" && !directoryUnavailable && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-[600px] mt-6 flex gap-4 relative z-0"
          >
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
              {!isLoadingMapPins && (
                <div className="absolute left-3 top-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                  {mapPins.length.toLocaleString()} coordinate-backed projects shown
                </div>
              )}
              {!isLoadingMapPins && (
                <label className="absolute bottom-6 right-3 z-[1000] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                  <span>Region</span>
                  <select
                    value={selectedRegion}
                    onChange={(event) => {
                      setSelectedRegion(event.target.value);
                      setSelectedProvince("all");
                      setSelectedMunicipality("all");
                      setSelectedBarangay("all");
                      setSelectedPin(null);
                    }}
                    className="max-w-[220px] rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="all">All Regions</option>
                    {regionsList.map((region) => (
                      <option key={region.value} value={region.value}>{region.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {!isLoadingMapPins && (
                <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                  <p className="mb-1.5 font-bold">Project status</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {PROJECT_MARKER_LEGEND.map((item) => (
                      <span key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="h-2.5 w-2.5 rounded-full border border-slate-900" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isLoadingMapPins ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Loading Map Pins...</p>
                </div>
              ) : (
                <GISMapCanvas
                  filteredPins={mapPins}
                  selectedProject={selectedPin}
                  setSelectedProject={setSelectedPin}
                  watershedOverlay={false}
                  agriZoneOverlay={false}
                  theme={theme === "dark" ? "dark" : "light"}
                  mapCenter={[12.8797, 121.7740]}
                  mapZoom={6}
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
                      return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
                    }
                    const projectDetails = selectedMapProjectDetails;
                    if (!projectDetails) return <p className="p-5 text-sm text-slate-500">Project details are unavailable.</p>;
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
                              {mapInternalToPublicStage(projectDetails.status)}
                            </span>
                            <div className="mt-3 text-[10px] text-slate-500 font-mono flex items-center border-b border-slate-100/80 dark:border-slate-800 pb-3">
                              ID: {projectDetails.id}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedPin(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Budget Box */}
                        <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 mb-4 mt-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-2">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">₱</span>
                            BUDGET
                          </div>
                          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {projectDetails.budget === null
                              ? "Unavailable"
                              : `₱${projectDetails.budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">LOCATION</span>
                          </div>
                          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Region</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.region || "Not available"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Province</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.province || "Not available"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Municipality</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.municipality || "Not available"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Barangay</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.barangay || "Not available"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">GPS</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300 text-right">{selectedPin.lat.toFixed(6)}, {selectedPin.lng.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Implementation */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">IMPLEMENTATION</span>
                          </div>
                          <div className="p-4 text-xs flex justify-between">
                            <span className="text-slate-500">Operating Unit</span>
                            <span className="font-semibold text-slate-900 dark:text-white text-right">{projectDetails.region || projectDetails.program.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* Project Details */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <MapIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">PROJECT DETAILS</span>
                          </div>
                          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Quantity</span>
                              <span className="font-semibold text-slate-900 dark:text-white text-right">
                                {projectDetails.quantity ? `${projectDetails.quantity} ${projectDetails.quantityUnit || ""}` : "Not available"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Geotagged Photos */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              GEOTAGGED PHOTOS ({geotagPhotos.length})
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
                                  alt="Geotagged Photo"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ) : (
                              <p className="text-xs text-slate-500 italic">No geotagged photos available.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sticky View Details Button */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10">
                        <Link href={projectHref(projectDetails.id)} className="block">
                          <Button className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-5 rounded-lg shadow-sm">
                            View Full Details {">"}
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

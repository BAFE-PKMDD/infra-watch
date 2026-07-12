"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Search, MapPin, Loader2, X, CheckCircle2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";

export interface ProjectResult {
  id: string;
  name: string;
  sourceProjectId?: string;
  sourceId?: string;
  code?: string;
  province?: string;
  municipality?: string;
}

export interface SelectedProject {
  id: string;
  name: string;
  sourceId?: string;
  sourceProjectId?: string;
  province?: string;
  municipality?: string;
}

interface ProjectSearchInputProps {
  /** Currently selected project, or null */
  value: SelectedProject | null;
  /** Callback when a project is selected */
  onSelect: (project: SelectedProject) => void;
  /** Callback when selection is cleared */
  onClear: () => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Visual variant — "default" shows a bordered input, "compact" shows a pill-style chip */
  variant?: "default" | "compact";
  /** Auto-focus the input when rendered */
  autoFocus?: boolean;
  /** Optional custom search function — overrides the default /api/projects endpoint */
  searchFn?: (query: string) => Promise<ProjectResult[]>;
  /** Optional prefix for the react-query cache key to avoid collisions */
  queryKeyPrefix?: string;
}

export function ProjectSearchInput({
  value,
  onSelect,
  onClear,
  placeholder = "Search for a project...",
  variant = "default",
  autoFocus = false,
  searchFn,
  queryKeyPrefix = "projects",
}: ProjectSearchInputProps) {
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Default search function — public /api/projects endpoint
  const defaultSearchFn = async (query: string): Promise<ProjectResult[]> => {
    const response = await fetch(
      `/api/projects?search=${encodeURIComponent(query)}`
    );
    if (!response.ok) throw new Error("Failed to search projects");
    const result = await response.json();

    return (result.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sourceProjectId: p.code,
      sourceId: p.sourceId,
      province: p.province,
      municipality: p.municipality,
    }));
  };

  const activeFn = searchFn || defaultSearchFn;

  // Search projects
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: [queryKeyPrefix, "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2)
        return [];
      return activeFn(debouncedSearch.trim());
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  });

  const canShowDropdown =
    debouncedSearch.trim().length >= 2 && !value && showDropdown;

  // Calculate dropdown position from the input wrapper
  const updateDropdownPosition = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Update position when dropdown is shown, and on scroll/resize
  useEffect(() => {
    if (!canShowDropdown) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [canShowDropdown, updateDropdownPosition]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (project: ProjectResult) => {
    onSelect({
      id: project.id,
      name: project.name,
      sourceId: project.sourceId,
      sourceProjectId: project.sourceProjectId,
      province: project.province,
      municipality: project.municipality,
    });
    setSearchInput("");
    setShowDropdown(false);
  };

  // ─── Selected state ──────────────────────────────
  if (value) {
    if (variant === "compact") {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <Link
            href={`/projects/${value.id}?tab=feedback`}
            target="_blank"
            className="text-sm font-medium text-sky-700 dark:text-sky-300 truncate flex-1 hover:underline"
          >
            {value.name}
          </Link>
          {value.municipality && (
            <span className="text-[11px] text-sky-500 dark:text-sky-400/70 hidden sm:inline whitespace-nowrap">
              {value.municipality}, {value.province}
            </span>
          )}
          <button
            type="button"
            onClick={onClear}
            className="p-0.5 rounded-full hover:bg-sky-200 dark:hover:bg-sky-800 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </button>
        </div>
      );
    }

    // Default variant — full badge (like the wizard)
    return (
      <div className="flex items-center gap-2 p-3 border-2 border-blue-500 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/projects/${value.id}?tab=feedback`}
            className="font-medium text-sm truncate text-slate-900 dark:text-white hover:underline block"
          >
            {value.name}
          </Link>
          {value.sourceProjectId && (
            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {value.sourceProjectId}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── Search input ──────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div ref={inputWrapperRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {/* Dropdown via Portal */}
      {canShowDropdown &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              style={dropdownStyle}
              className="z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
            >
              {isFetching ? (
                <div className="p-4 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-600 dark:text-slate-400">
                  No projects found
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleSelect(project)}
                      className="w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-slate-900 dark:text-white">
                          {project.name}
                        </div>
                        {(project.municipality || project.sourceProjectId) && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {project.municipality
                              ? `${project.municipality}, ${project.province}`
                              : project.sourceProjectId}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

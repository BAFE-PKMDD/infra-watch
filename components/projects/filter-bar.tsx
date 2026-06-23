import { motion } from "framer-motion";
import { useTranslation } from "@/i18n";
import { memo } from "react";

import type { LocationFilters, LocationOptions } from "@/types";

interface FilterBarProps {
  filters: LocationFilters;
  options: LocationOptions;
  onFiltersChange: (key: keyof LocationFilters, value: string) => void;
}

export const FilterBar = memo(function FilterBar({ filters, options, onFiltersChange }: FilterBarProps) {
  const { t } = useTranslation();

  const selectClassName = "flex-1 min-w-[180px] text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 font-medium cursor-pointer bg-white hover:border-slate-400 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100";

  return (
    <motion.div
      className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/60"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Agency Toggle */}
      <div className="flex items-center gap-1.5 mb-3">
        {options.agencies.map((option) => (
          <button
            key={option.value}
            onClick={() => onFiltersChange("agency", option.value)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 ${filters.agency === option.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-primary"
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Location & Other Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filters.region}
          onChange={(e) => onFiltersChange("region", e.target.value)}
          className={selectClassName}
        >
          {options.regions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={filters.province}
          onChange={(e) => onFiltersChange("province", e.target.value)}
          className={selectClassName}
        >
          {options.provinces.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.city}
          onChange={(e) => onFiltersChange("city", e.target.value)}
          className={selectClassName}
        >
          {options.cities.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.barangay}
          onChange={(e) => onFiltersChange("barangay", e.target.value)}
          className={selectClassName}
        >
          {options.barangays.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.stage}
          onChange={(e) => onFiltersChange("stage", e.target.value)}
          className={selectClassName}
        >
          <option value="all">{t("projects.filters.status")}</option>
          {options.stages.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.year || "all"}
          onChange={(e) => onFiltersChange("year", e.target.value)}
          className={selectClassName}
        >
          {options.years?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
});

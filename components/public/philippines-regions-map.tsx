"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Banknote, CheckCircle2, Layers, MapPin } from "lucide-react";
import {
  createEquirectangularProjector,
  geometryToSvgPath,
  type GeoFeatureCollection,
} from "@/lib/geojson-to-svg-path";
import { PHILIPPINE_REGION_BY_CODE, type RegionCode } from "@/lib/philippines-regions";
import type { RegionalStat } from "@/actions/query/analytics.query";

const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 640;

function formatBudget(value: number): string {
  if (value <= 0) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCompletionRate(completedOrTurnedOver: number, target: number): string {
  if (target <= 0) return "0%";
  return `${((completedOrTurnedOver / target) * 100).toFixed(2)}%`;
}

function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === "string" && PHILIPPINE_REGION_BY_CODE.has(value as RegionCode);
}

export function PhilippinesRegionsMap({
  provinces,
  regionalStats,
}: {
  provinces: GeoFeatureCollection;
  regionalStats: RegionalStat[];
}) {
  const [activeCode, setActiveCode] = useState<RegionCode | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const statsByCode = useMemo(
    () => new Map(regionalStats.map((stat) => [stat.region, stat])),
    [regionalStats],
  );

  const project = useMemo(
    () => createEquirectangularProjector(provinces, VIEW_WIDTH, VIEW_HEIGHT),
    [provinces],
  );

  // Each province is its own shape (so an island region like NIR renders correctly
  // separate from its geographic neighbors), but every province belonging to the
  // same region code highlights together as one group on hover/focus.
  const provincePaths = useMemo(
    () =>
      provinces.features
        .map((feature) => {
          const code = feature.properties.map_region_code;
          if (!isRegionCode(code)) return null;
          return {
            code,
            province: String(feature.properties.province ?? ""),
            d: geometryToSvgPath(feature.geometry, project),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [provinces, project],
  );

  const activeRegion = activeCode ? PHILIPPINE_REGION_BY_CODE.get(activeCode) : null;
  const activeStat = activeCode ? statsByCode.get(activeCode) : null;
  const panelState = activeRegion && activeStat ? "stats" : activeRegion ? "no-data" : "idle";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Regional Overview
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Hover or focus a region on the map to see its funded and completed agricultural and
          fisheries infrastructure projects for 2021&ndash;2026.
        </p>

        <div
          className="relative mt-6 min-h-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          role="status"
          aria-live="polite"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-1 transition-colors duration-300 ${
              panelState === "idle" ? "bg-slate-100 dark:bg-slate-800" : "bg-emerald-500"
            }`}
          />

          <AnimatePresence mode="wait">
            {panelState === "stats" && activeRegion && activeStat ? (
              <motion.div
                key={activeRegion.code}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <MapPin className="size-3.5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeRegion.displayName}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <Banknote className="size-3" aria-hidden="true" />
                      Total Investment
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {formatBudget(activeStat.approvedBudget)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <Layers className="size-3" aria-hidden="true" />
                      Total Projects
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{activeStat.target}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Completed Projects
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {formatCompletionRate(activeStat.completedOrTurnedOver, activeStat.target)}
                    </dd>
                  </div>
                </dl>
              </motion.div>
            ) : panelState === "no-data" && activeRegion ? (
              <motion.div
                key="no-data"
                initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{activeRegion.displayName}</span>
                  {" "}has no funded projects on record for 2021&ndash;2026.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex h-full min-h-28 flex-col items-center justify-center gap-2 py-4 text-center"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  Hover a region to see its details
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
          aria-label="Map of Philippine regions. Hover or tab through each region to see its project counts."
          className="h-auto w-full"
        >
          {provincePaths.map((entry, index) => {
            const isActive = entry.code === activeCode;
            const region = PHILIPPINE_REGION_BY_CODE.get(entry.code);
            const stat = statsByCode.get(entry.code);
            return (
              <path
                key={`${entry.code}-${entry.province}-${index}`}
                d={entry.d}
                tabIndex={0}
                role="button"
                aria-label={`${region?.displayName ?? entry.code}: ${stat?.target ?? 0} funded projects`}
                onMouseEnter={() => setActiveCode(entry.code)}
                onMouseLeave={() => setActiveCode((current) => (current === entry.code ? null : current))}
                onFocus={() => setActiveCode(entry.code)}
                onBlur={() => setActiveCode((current) => (current === entry.code ? null : current))}
                className="cursor-pointer stroke-white transition-colors duration-150 outline-none focus-visible:stroke-emerald-900 dark:stroke-slate-950"
                style={{
                  fill: isActive ? "#059669" : "#cbd5e1",
                  strokeWidth: 0.75,
                }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

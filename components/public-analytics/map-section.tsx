"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";

import type { MapPoint } from "@/lib/public-analytics/aggregate";
import { publicAnalyticsStrings as S, format, formatCount } from "@/lib/public-analytics/strings";

import { Section } from "./chart-card";
import type { FlyTarget } from "./project-map";
import { StageSwatch } from "./stage-bar";
import { STAGE_DISPLAY_ORDER } from "./stage-colors";

const t = S.en;

const ProjectMap = dynamic(() => import("./project-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-pa-surface-2" />,
});

type Place = { label: string; kind: "province" | "municipality" | "barangay"; projects: number; lat: number; lng: number };

const ZOOM_FOR_KIND = { province: 9, municipality: 12, barangay: 14 } as const;

export function MapSection({ query, unmapped }: { query: string; unmapped: number }) {
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [flyTo, setFlyTo] = useState<FlyTarget>(null);
  const searchId = useId();
  const resultsId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/map-points${query ? `?${query}` : ""}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: { data: MapPoint[] }) => !cancelled && setPoints(json.data))
      .catch(() => !cancelled && setPoints([]));
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(query);
      params.set("q", trimmed);
      fetch(`/api/public/places?${params.toString()}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((json: { data: Place[] }) => setPlaces(json.data))
        .catch(() => undefined);
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, query]);

  const visiblePlaces = search.trim().length >= 2 ? places : null;

  return (
    <Section title={t.map.title} description={t.map.description}>
      <div className="relative">
        <label htmlFor={searchId} className="text-sm font-medium text-pa-ink-2">{t.map.searchLabel}</label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.map.searchPlaceholder}
          aria-controls={resultsId}
          autoComplete="off"
          className="mt-1 min-h-11 w-full rounded-md border border-pa-axis bg-pa-surface-2 px-3 text-base text-pa-ink placeholder:text-pa-muted"
        />
        <div id={resultsId} aria-live="polite">
          {visiblePlaces !== null ? (
            visiblePlaces.length === 0 ? (
              <p className="mt-2 text-base text-pa-ink-2">{t.map.noPlaces}</p>
            ) : (
              <ul className="mt-2 divide-y divide-pa-hair rounded-md border border-pa-hair bg-pa-surface">
                {visiblePlaces.map((place) => (
                  <li key={`${place.kind}:${place.label}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFlyTo({ lat: place.lat, lng: place.lng, zoom: ZOOM_FOR_KIND[place.kind], key: Date.now() });
                        setPlaces(null);
                        setSearch(place.label);
                      }}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-base text-pa-ink hover:bg-pa-accent-soft"
                    >
                      <span>{place.label}</span>
                      <span className="shrink-0 text-sm text-pa-ink-2">{formatCount(place.projects)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>

      <div className="pa-map relative isolate z-0 mt-4 h-[420px] overflow-hidden rounded-md border border-pa-hair sm:h-[520px]">
        {points ? <ProjectMap points={points} flyTo={flyTo} /> : <div className="h-full w-full bg-pa-surface-2" />}
      </div>

      <div className="mt-3">
        <p className="text-sm font-medium text-pa-ink-2">{t.map.legend}</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {STAGE_DISPLAY_ORDER.map((stage) => (
            <li key={stage} className="flex items-center gap-2 text-base text-pa-ink">
              <StageSwatch stage={stage} />
              {t.stages[stage]}
            </li>
          ))}
        </ul>
        {unmapped > 0 ? <p className="mt-2 text-sm text-pa-ink-2">{format(t.map.notMapped, { count: formatCount(unmapped) })}</p> : null}
      </div>
    </Section>
  );
}

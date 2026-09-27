"use client";

import { useState } from "react";

import type { FacilityCategoryKey } from "@/lib/public-analytics/rules";
import { publicAnalyticsStrings as S, format, formatCount } from "@/lib/public-analytics/strings";

import { DataTable, HorizontalBars, MeasureToggle, Section, type Measure } from "./chart-card";

const t = S.en;

type CategoryRow = {
  label: FacilityCategoryKey;
  projects: number;
  pesos: number;
  topTypes: Array<{ label: string; projects: number }>;
};

export function CategoryChart({ rows }: { rows: CategoryRow[] }) {
  const [measure, setMeasure] = useState<Measure>("projects");
  const [selected, setSelected] = useState<FacilityCategoryKey | null>(null);
  const chartRows = rows.map((row) => ({ key: row.label, label: t.categories[row.label], projects: row.projects, pesos: row.pesos }));
  const active = rows.find((row) => row.label === selected) ?? null;

  return (
    <Section title={t.category.title} description={t.category.hint}>
      <div className="mb-4">
        <MeasureToggle value={measure} onChange={setMeasure} label={t.chart.measure} />
      </div>
      <HorizontalBars
        rows={chartRows}
        measure={measure}
        selectedKey={selected}
        onSelect={(key) => setSelected((current) => (current === key ? null : (key as FacilityCategoryKey)))}
      />
      <div aria-live="polite">
        {active && active.topTypes.length > 0 ? (
          <div className="mt-4 rounded-md border border-pa-hair bg-pa-surface-2 p-4">
            <h3 className="pa-heading text-lg font-semibold text-pa-ink">
              {format(t.category.topTypes, { category: t.categories[active.label] })}
            </h3>
            <ul className="mt-2 space-y-1">
              {active.topTypes.map((type) => (
                <li key={type.label} className="flex justify-between gap-4 text-base text-pa-ink">
                  <span>{type.label}</span>
                  <span className="font-medium">{formatCount(type.projects)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <DataTable rows={chartRows} showPesos />
    </Section>
  );
}

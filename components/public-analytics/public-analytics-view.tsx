import { ChevronDown, Droplets, SolarPanel, Sprout, Warehouse, Wheat, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RECIPIENT_NOT_RECORDED, filtersToSearchParams } from "@/lib/public-analytics/aggregate";
import type { FacilityTileKey } from "@/lib/public-analytics/aggregate";
import { OTHER_PROGRAMS } from "@/lib/public-analytics/rules";
import { cn } from "@/lib/utils";
import { format, formatCount, formatPesosShort, formatPublicDate, type PublicAnalyticsStrings } from "@/lib/public-analytics/strings";
import type { Dashboard } from "@/lib/public-analytics/views";

import { BarChartCard, Section } from "./chart-card";
import { CategoryChart } from "./category-chart";
import { FiltersBar } from "./filters-bar";
import { MapSection } from "./map-section";
import { ProjectList } from "./project-list";
import { StageBar } from "./stage-bar";

const TILE_ICONS: Record<FacilityTileKey, LucideIcon> = {
  solarIrrigation: SolarPanel,
  greenhouses: Sprout,
  dryingPavements: Wheat,
  warehouses: Warehouse,
  diversionDams: Droplets,
};

/** `primary` marks the measures that matter most for budget oversight; everything else stays visually secondary. */
function StatCard({ label, value, note, primary }: { label: string; value: string; note?: string; primary?: boolean }) {
  return (
    <div className="rounded-lg border border-pa-hair bg-pa-surface p-4">
      <dt className="text-base text-pa-ink-2">{label}</dt>
      <dd className={cn("mt-1 font-semibold tabular-nums text-pa-ink", primary ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl")}>{value}</dd>
      {note ? <dd className="mt-1 text-sm text-pa-ink-2">{note}</dd> : null}
    </div>
  );
}

/** Collapsed by default: keeps supporting breakdowns out of the first read without hiding them. */
function OtherMetrics({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-pa-hair bg-pa-surface p-4 [&::-webkit-details-marker]:hidden sm:p-6">
        <span>
          <span className="pa-heading block text-xl font-semibold text-pa-ink sm:text-2xl">{title}</span>
          <span className="mt-1 block text-base text-pa-ink-2">{description}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-pa-ink-2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-6 space-y-6">{children}</div>
    </details>
  );
}

/** Server-rendered page body; `t` holds the strings for the visitor's language. */
export function PublicAnalyticsView({ dashboard, t }: { dashboard: Dashboard; t: PublicAnalyticsStrings }) {
  const query = filtersToSearchParams(dashboard.filters).toString();
  const { summary } = dashboard;
  const areaTitle = dashboard.area.level === "region" ? t.area.titleRegion : dashboard.area.level === "province" ? t.area.titleProvince : t.area.titleMunicipality;
  const areaLabel = dashboard.area.level === "region" ? t.filters.region : dashboard.area.level === "province" ? t.filters.province : t.filters.municipality;
  const toRows = (rows: Array<{ label: string; projects: number; pesos?: number }>) => rows.map((row) => ({ key: row.label, ...row }));
  // The data layer keeps these two fixed English bucket names; show them in the visitor's language.
  const bucketLabel = (label: string) => (label === OTHER_PROGRAMS ? t.program.other : label === RECIPIENT_NOT_RECORDED ? t.project.notRecorded : label);
  const toBucketRows = (rows: Array<{ label: string; projects: number; pesos?: number }>) =>
    rows.map((row) => ({ ...row, key: row.label, label: bucketLabel(row.label) }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <h1 className="pa-heading text-3xl font-semibold text-pa-ink sm:text-4xl">{t.page.title}</h1>
        <p className="max-w-3xl text-base text-pa-ink-2 sm:text-lg">{t.page.intro}</p>
        {dashboard.dataAsOf ? (
          <p className="text-sm text-pa-muted">{format(t.page.dataAsOf, { date: formatPublicDate(dashboard.dataAsOf) })}</p>
        ) : null}
      </header>

      <div className="rounded-lg border border-pa-hair bg-pa-surface p-4">
        <FiltersBar filters={dashboard.filters} options={dashboard.options} />
      </div>

      {summary.projects === 0 ? (
        <p role="status" className="rounded-lg border border-pa-hair bg-pa-surface p-6 text-base text-pa-ink-2">{t.page.noMatch}</p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
            <StatCard
              primary
              label={t.headline.investment}
              value={formatPesosShort(summary.investment)}
              note={summary.projectsWithBudget < summary.projects ? format(t.headline.investmentNote, { count: formatCount(summary.projectsWithBudget) }) : undefined}
            />
            <StatCard primary label={t.headline.projects} value={formatCount(summary.projects)} />
            <StatCard label={t.headline.finished} value={formatCount(summary.finished)} />
            <StatCard label={t.headline.farmerGroups} value={formatCount(summary.farmerGroups)} />
            <StatCard label={t.headline.provinces} value={formatCount(summary.provinces)} />
          </dl>

          {/* Primary measures: at most two analytical charts in the first read, per docs/06-ui-ux-design.md */}
          <BarChartCard title={areaTitle} rows={toRows(dashboard.area.rows)} measures={["pesos", "projects"]} limit={10} labelHeader={areaLabel} />

          <BarChartCard title={t.year.title} rows={toRows(dashboard.years)} measures={["projects", "pesos"]} layout="columns" labelHeader={t.filters.year} />

          {/* Project evidence: find and verify an individual project */}
          <MapSection query={query} unmapped={dashboard.unmapped} />

          <ProjectList query={query} />

          {/* Supporting analysis, collapsed by default so it doesn't compete with the primary measures above */}
          <OtherMetrics title={t.otherMetrics.title} description={t.otherMetrics.description}>
            <CategoryChart rows={dashboard.categories} />

            <BarChartCard title={t.program.title} rows={toBucketRows(dashboard.programs)} measures={["projects", "pesos"]} />

            <Section title={t.stage.title}>
              <StageBar rows={dashboard.stages} t={t} />
            </Section>

            <BarChartCard title={t.recipient.title} rows={toBucketRows(dashboard.recipients)}>
              <div className="mt-4 inline-block rounded-md border border-pa-hair bg-pa-surface-2 px-4 py-3">
                <p className="text-3xl font-semibold text-pa-ink">{formatCount(summary.farmerGroups)}</p>
                <p className="text-base text-pa-ink-2">{t.recipient.farmerGroups}</p>
              </div>
            </BarChartCard>

            {dashboard.commodities.length > 0 ? (
              <BarChartCard title={t.commodity.title} rows={toRows(dashboard.commodities)} />
            ) : (
              <Section title={t.commodity.title}><p className="text-base text-pa-ink-2">{t.commodity.empty}</p></Section>
            )}

            <Section title={t.tiles.title} description={t.tiles.note}>
              <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
                {dashboard.tiles.map((tile) => {
                  const Icon = TILE_ICONS[tile.key];
                  return (
                    <li key={tile.key} className="flex items-center gap-3 rounded-md border border-pa-hair bg-pa-surface-2 p-4">
                      <Icon aria-hidden="true" className="size-6 shrink-0 text-pa-ink-2" />
                      <p>
                        <span className="block text-2xl font-semibold text-pa-ink">{formatCount(tile.projects)}</span>
                        <span className="text-base text-pa-ink-2">{t.facilityTiles[tile.key]}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Section>

            <BarChartCard
              title={t.finished.title}
              description={dashboard.finishedWithoutDate > 0 ? format(t.finished.note, { count: formatCount(dashboard.finishedWithoutDate) }) : undefined}
              rows={toRows(dashboard.finished)}
              layout="columns"
              labelHeader={t.filters.year}
            />
          </OtherMetrics>
        </>
      )}

      <footer className="rounded-lg border border-pa-hair bg-pa-surface p-4 sm:p-6">
        <h2 className="pa-heading text-xl font-semibold text-pa-ink">{t.howWeCount.title}</h2>
        <div className="mt-2 space-y-2 text-base text-pa-ink-2">
          {t.howWeCount.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </footer>
    </div>
  );
}

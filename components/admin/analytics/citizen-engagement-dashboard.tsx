import { Activity, Info, Map, MessageSquare, Search, Star } from "lucide-react";

import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";
import { CitizenActivityChart } from "./citizen-activity-chart";
import { CitizenNetworkRegionMapLoader } from "./citizen-network-region-map-loader";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Metric({ label, value, note, icon: Icon }: {
  label: string;
  value: string;
  note: string;
  icon: typeof Activity;
}) {
  return (
    <div className="min-w-0 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{note}</p>
    </div>
  );
}

function RankingTable({
  title,
  rows,
  emptyMessage,
  valueLabel,
}: {
  title: string;
  rows: CitizenEngagementAnalytics["projectDiscovery"]["mostViewed"];
  emptyMessage: string;
  valueLabel: "Views" | "Opens";
}) {
  return (
    <section aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`} className="min-w-0">
      <h3 id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`} className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 border-l-2 border-slate-200 py-2 pl-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyMessage}</p>
      ) : (
        <div tabIndex={0} role="region" aria-label={`${title} project ranking; scroll horizontally for all columns`} className="mt-3 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr><th className="pb-2 pr-4 font-medium">Project</th><th className="pb-2 text-right font-medium">{valueLabel}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <tr key={row.projectId}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{row.projectName}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{row.projectId}</p>
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CategoryList({ title, rows }: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No submissions recorded for this period.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
                <span className="font-semibold tabular-nums text-slate-950 dark:text-white">{formatNumber(row.count)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((row.count / maximum) * 100, 3)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const resultBandLabels: Record<string, string> = {
  "0": "No results",
  "1_10": "1–10 results",
  "11_50": "11–50 results",
  "51_plus": "51+ results",
};

export function CitizenEngagementDashboard({ data }: { data: CitizenEngagementAnalytics }) {
  const hasActivity = Object.values(data.overview).some((value) => typeof value === "number" && value > 0)
    || data.projectDiscovery.mostOpenedFromSearch.length > 0
    || data.projectDiscovery.mostOpenedFromMap.length > 0
    || data.projectDiscovery.mostViewed.length > 0
    || data.networkGeography.regions.length > 0
    || data.commonIssues.feedbackThemes.length > 0
    || data.commonIssues.eReportTypes.length > 0;

  return (
    <div className="space-y-6">
      <section aria-label="Reporting context" className="flex flex-col gap-3 border-y border-slate-200 py-4 text-sm text-slate-600 md:flex-row md:items-start md:justify-between dark:border-slate-800 dark:text-slate-300">
        <div>
          <p className="font-medium text-slate-950 dark:text-white">{data.range.from} to {data.range.to}</p>
          <p className="mt-1">Reporting timezone: {data.range.timeZone}. Activity metrics count actions, not unique people. Activity events are retained for {data.freshness.eventRetentionDays} days.</p>
        </div>
        <div className="md:text-right">
          <p>Generated {formatGeneratedAt(data.freshness.generatedAt)}</p>
          <p className="mt-1">Maximum selectable range: {data.range.maximumDays} days</p>
        </div>
      </section>

      {!hasActivity ? (
        <section role="status" className="border-l-4 border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <h2 className="font-semibold text-slate-950 dark:text-white">No citizen activity recorded</h2>
          <p className="mt-1">No searches, project or map views or selections, ratings, comments, feedback themes, or E-Report issue types were recorded for this period.</p>
        </section>
      ) : <>

      <section aria-labelledby="engagement-summary-heading">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-5 text-primary" aria-hidden="true" />
          <h2 id="engagement-summary-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Citizen engagement</h2>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
          <Metric icon={Search} label="Completed searches" value={formatNumber(data.overview.searches)} note="Settled query or filter result" />
          <Metric icon={Activity} label="Project detail views" value={formatNumber(data.overview.projectViews)} note="Detail page mounted in a browser" />
          <Metric icon={Map} label="Map views" value={formatNumber(data.overview.mapViews)} note="Catalog or project map opened" />
          <Metric icon={Star} label="Ratings submitted" value={formatNumber(data.overview.ratingsSubmitted)} note="Persisted feedback with a rating" />
          <Metric icon={MessageSquare} label="Comments submitted" value={formatNumber(data.overview.commentsSubmitted)} note="Persisted non-empty feedback comments" />
          <Metric icon={Star} label="Average rating" value={data.overview.averageRating === null ? "Unavailable" : `${data.overview.averageRating.toFixed(2)} / 5`} note={data.overview.averageRating === null ? "No ratings submitted in this period" : `Average of ${formatNumber(data.overview.ratingsSubmitted)} ratings`} />
        </div>
      </section>

      <section aria-labelledby="daily-activity-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="daily-activity-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Daily activity graph</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recorded actions by Asia/Manila calendar date. Counts are actions, not unique people.</p>
        <CitizenActivityChart trend={data.trend} />
        <details className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View daily totals</summary>
          <div tabIndex={0} role="region" aria-label="Daily activity table; scroll horizontally for all columns" className="mt-2 max-h-[420px] overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4 font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Searches</th><th className="px-3 py-2 text-right font-medium">Project views</th><th className="px-3 py-2 text-right font-medium">Map views</th><th className="px-3 py-2 text-right font-medium">Ratings</th><th className="pl-3 py-2 text-right font-medium">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...data.trend].reverse().map((row) => (
                <tr key={row.date}>
                  <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{row.date}</td>
                  {[row.searches, row.projectViews, row.mapViews, row.ratingsSubmitted, row.commentsSubmitted].map((value, index) => <td key={index} className="px-3 py-2.5 text-right tabular-nums text-slate-700 last:pl-3 last:pr-0 dark:text-slate-300">{formatNumber(value)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      </section>

      <section aria-labelledby="network-geography-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="network-geography-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Approximate network-region activity</h2>
        <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-600 dark:text-slate-300">Counts represent actions, not people. Regions with fewer than five actions are omitted. IP addresses are processed transiently and are not stored. Network location can be inaccurate and does not represent a reporter’s residence.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">GeoLite2 data created by MaxMind. Region polygons use the portal’s simplified PSGC boundary dataset.</p>
        <CitizenNetworkRegionMapLoader geography={data.networkGeography} />
      </section>

      <section aria-labelledby="project-discovery-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="project-discovery-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Project discovery</h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">“Opened from search” counts project selections after a settled text query. Search terms are not stored, so this is not labelled “most searched.”</p>
        <div className="mt-5 grid gap-8 xl:grid-cols-2 2xl:grid-cols-3">
          <RankingTable title="Most viewed" valueLabel="Views" rows={data.projectDiscovery.mostViewed} emptyMessage="No project views recorded." />
          <RankingTable title="Opened from search" valueLabel="Opens" rows={data.projectDiscovery.mostOpenedFromSearch} emptyMessage="No search-result opens recorded." />
          <RankingTable title="Opened from map" valueLabel="Opens" rows={data.projectDiscovery.mostOpenedFromMap} emptyMessage="No map project opens recorded." />
        </div>
        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Search result distribution</h3>
          {data.projectDiscovery.searchResultBands.length === 0 ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No completed searches recorded.</p> : (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {data.projectDiscovery.searchResultBands.map((row) => <p key={row.band} className="text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold tabular-nums text-slate-950 dark:text-white">{formatNumber(row.count)}</span> {resultBandLabels[row.band] ?? row.band}</p>)}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="common-issues-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="common-issues-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Common issues</h2>
        <div className="mt-2 flex gap-2 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <p>Feedback themes and E-Report issue types use different source taxonomies. Each E-Report counts once for every selected issue type. Reports without a recorded issue type appear as Not classified.</p>
        </div>
        <div className="mt-5 grid gap-8 md:grid-cols-2">
          <CategoryList title="Feedback themes" rows={data.commonIssues.feedbackThemes} />
          <CategoryList title="E-Report issue types" rows={data.commonIssues.eReportTypes} />
        </div>
      </section>
      </>}
    </div>
  );
}

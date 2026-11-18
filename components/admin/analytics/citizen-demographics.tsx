import { Users } from "lucide-react";

import type { DemographicDistribution, SurveyDemographics } from "@/lib/analytics/survey-demographics";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function DistributionList({ title, distribution, total, minimumGroupSize }: {
  title: string;
  distribution: DemographicDistribution;
  total: number;
  minimumGroupSize: number;
}) {
  const maximum = Math.max(...distribution.rows.map((row) => row.count), 1);
  return (
    <section aria-labelledby={`demographics-${title.replace(/\s+/g, "-").toLowerCase()}`} className="min-w-0">
      <h3 id={`demographics-${title.replace(/\s+/g, "-").toLowerCase()}`} className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {distribution.rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Not enough responses to show.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {distribution.rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
                <span className="tabular-nums text-slate-950 dark:text-white">
                  <span className="font-semibold">{formatNumber(row.count)}</span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{total > 0 ? `${Math.round((row.count / total) * 100)}%` : ""}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((row.count / maximum) * 100, 3)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {distribution.hasHiddenGroups ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Groups under {minimumGroupSize} are not shown.</p>
      ) : null}
    </section>
  );
}

export function CitizenDemographics({ data }: { data: SurveyDemographics }) {
  return (
    <section aria-labelledby="demographics-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-primary" aria-hidden="true" />
        <h2 id="demographics-heading" className="text-lg font-semibold text-slate-950 dark:text-white">Who is using InfraWatch</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        From the optional survey shown before a first submission. Percentages are of people who answered, not of all visitors.
      </p>

      {data.asked === 0 ? (
        <p role="status" className="mt-4 border-l-2 border-slate-200 py-2 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          No survey responses recorded for this period.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-sm dark:border-slate-800 dark:bg-slate-800">
            <div className="bg-white p-3 dark:bg-slate-900">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Asked</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">{formatNumber(data.asked)}</dd>
            </div>
            <div className="bg-white p-3 dark:bg-slate-900">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Answered</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">
                {formatNumber(data.answered)}
                {data.responseRate !== null ? <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">{data.responseRate}%</span> : null}
              </dd>
            </div>
            <div className="bg-white p-3 dark:bg-slate-900">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Skipped</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">{formatNumber(data.skipped)}</dd>
            </div>
          </dl>

          {data.answered === 0 ? (
            <p role="status" className="mt-4 border-l-2 border-slate-200 py-2 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Everyone skipped the survey in this period, so there are no answers to break down.
            </p>
          ) : (
            <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              <DistributionList title="Respondent type" distribution={data.respondentTypes} total={data.answered} minimumGroupSize={data.minimumGroupSize} />
              <DistributionList title="Age range" distribution={data.ageBands} total={data.answered} minimumGroupSize={data.minimumGroupSize} />
              <DistributionList title="Gender" distribution={data.genders} total={data.answered} minimumGroupSize={data.minimumGroupSize} />
              <DistributionList title="How they found InfraWatch" distribution={data.referralSources} total={data.answered} minimumGroupSize={data.minimumGroupSize} />
              <DistributionList title="Answered while submitting" distribution={data.surveySources} total={data.answered} minimumGroupSize={data.minimumGroupSize} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

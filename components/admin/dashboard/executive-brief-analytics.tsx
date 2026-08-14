"use client";

import { AlertTriangle, BrainCircuit, ClipboardCheck, ScanSearch } from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ExecutiveInsights } from "./executive-insights";
import { ExecutiveKpis } from "./executive-kpis";
import { PriorityProjectsTable } from "./priority-projects-table";
import { ProgressVarianceChart } from "./progress-variance-chart";
import { RegionalPerformanceChart } from "./regional-performance-chart";
import { ScheduleHealthChart } from "./schedule-health-chart";

export function summarizeForecastReadiness(
  projects: ManagerialDashboardData["priorityProjects"],
) {
  const summary = {
    projected: 0,
    targetRisk: 0,
    stalled: 0,
    insufficientHistory: 0,
    completed: 0,
    inactive: 0,
    total: projects.length,
  };
  for (const project of projects) {
    const status = project.forecast?.status ?? "insufficientHistory";
    summary[status] += 1;
    if (project.forecast?.status === "projected" && project.forecast.targetRisk === true) {
      summary.targetRisk += 1;
    }
  }
  return summary;
}

function LensHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-xl bg-blue-50 p-2.5 text-primary dark:bg-blue-950/40">{icon}</div>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </div>
  );
}

export function ExecutiveBriefAnalytics({ data }: { data: ManagerialDashboardData }) {
  const forecasts = summarizeForecastReadiness(data.priorityProjects);
  const projectedLabel = `${forecasts.projected.toLocaleString("en-PH")} of ${forecasts.total.toLocaleString("en-PH")} priority projects have an evidence-backed projected completion date.`;

  return (
    <div className="space-y-8">
      <section aria-labelledby="brief-descriptive-heading">
        <LensHeading
          icon={<ScanSearch className="size-5" />}
          eyebrow="Descriptive analytics"
          title="What is happening across the authorized portfolio?"
          description="Official portfolio totals, financial values, completion, and rules-based schedule-health distribution from the captured executive-brief scope."
        />
        <div id="brief-descriptive-heading" className="space-y-4">
          <ExecutiveKpis kpis={data.kpis} coverage={data.coverage} />
          <ScheduleHealthChart data={data.scheduleHealth} />
        </div>
      </section>

      <section aria-labelledby="brief-diagnostic-heading">
        <LensHeading
          icon={<BrainCircuit className="size-5" />}
          eyebrow="Diagnostic analytics"
          title="Where are the material gaps and likely contributors?"
          description="Regional performance and project-level progress variance expose concentration, schedule deficits, and evidence gaps without claiming causation that the source does not establish."
        />
        <div id="brief-diagnostic-heading" className="grid gap-4 xl:grid-cols-2">
          <RegionalPerformanceChart data={data.regions} />
          <ProgressVarianceChart data={data.progressVariance} />
        </div>
      </section>

      <section aria-labelledby="brief-predictive-heading">
        <LensHeading
          icon={<AlertTriangle className="size-5" />}
          eyebrow="Predictive analytics"
          title="What does approved historical evidence support?"
          description="Forecasts appear only where approved snapshot history supports a projection. Current schedule-health rules are an outlook, not a trained prediction."
        />
        <div id="brief-predictive-heading" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ForecastCard label="Projected dates available" value={forecasts.projected} detail={projectedLabel} />
          <ForecastCard label="Projected target risk" value={forecasts.targetRisk} detail="Projected projects whose evidence-backed completion date falls beyond the target." tone="warning" />
          <ForecastCard label="Stalled" value={forecasts.stalled} detail="Projects with no observed progress velocity for a completion projection." tone="warning" />
          <ForecastCard label="Insufficient history" value={forecasts.insufficientHistory} detail="No projection is shown until enough approved history exists." />
        </div>
      </section>

      <section aria-labelledby="brief-prescriptive-heading">
        <LensHeading
          icon={<ClipboardCheck className="size-5" />}
          eyebrow="Prescriptive analytics"
          title="What should management examine or act on next?"
          description="Advisory actions are tied to deterministic insights and ranked priority projects. They do not modify records or replace official management decisions."
        />
        <div id="brief-prescriptive-heading" className="space-y-4">
          <ExecutiveInsights insights={data.insights} onApplyFilter={() => undefined} interactive={false} />
          <PriorityProjectsTable projects={data.priorityProjects} />
        </div>
      </section>
    </div>
  );
}

function ForecastCard({ label, value, detail, tone = "default" }: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <article className={tone === "warning" ? "rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25" : "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-slate-950 dark:text-white">{value.toLocaleString("en-PH")}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
    </article>
  );
}

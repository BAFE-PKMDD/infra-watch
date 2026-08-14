import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import type { ProjectDetail } from "@/types";
import { buildReportIssuePath } from "@/lib/report-issue-project-link";

export function ProjectPassport({ project, returnHref = "/projects" }: { project: ProjectDetail; returnHref?: string }) {
  const coordinateCopy = project.coordinateStatus === "verified"
    ? "Verified source coordinates"
    : "Coordinates unavailable";

  return (
    <section aria-labelledby="project-passport-title" className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Public source record</p>
          <h2 id="project-passport-title" className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">Project Passport</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            A traceable summary of the latest infrastructure record received by InfraWatch. Missing source values remain unavailable and are never estimated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnHref} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-800 hover:border-blue-500 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
            Back to project results
          </Link>
          <Link
            href={buildReportIssuePath(project.id)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Report an issue about this project
          </Link>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PassportField label="Source" value={project.sourceSystem || project.sourceAgency || "Unavailable"} />
        <PassportField label="Last successful sync" value={project.lastSyncedAt || "Unavailable"} />
        <PassportField
          label="Data completeness"
          value={project.dataCoverage ? `${project.dataCoverage.available} of ${project.dataCoverage.total} core fields available` : "Unavailable"}
        />
        <PassportField label="Location evidence" value={coordinateCopy} />
        <PassportField
          label="Approved budget"
          value={project.budget === null ? "Unavailable" : formatCurrency(project.budget)}
          description="Approved allocation recorded by the source. This is not actual expenditure."
        />
        <PassportField
          label="Supplier actual bid"
          value={project.abc === undefined || project.abc === null ? "Unavailable" : formatCurrency(project.abc)}
          description="Supplier bid amount from the ABEMIS ABC field. This is not the approved allocation or expenditure."
        />
      </dl>
    </section>
  );
}

function PassportField({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{value}</dd>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

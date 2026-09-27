import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ProjectFeedback } from "@/components/projects/project-feedback";
import type { PublicProjectDetail } from "@/lib/public-analytics/service";
import { publicAnalyticsStrings as S, format, formatPesos, formatPublicDate } from "@/lib/public-analytics/strings";

import { StageSwatch } from "../stage-bar";
import { LocationMapLoader } from "./location-map-loader";
import { PhotoGallery } from "./photo-gallery";
import { PlannedVsActual } from "./planned-vs-actual";
import { ProjectViewTracker } from "./view-tracker";

const t = S.en;

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-t border-pa-hair py-3">
      <dt className="text-sm text-pa-ink-2">{label}</dt>
      <dd className="mt-0.5 text-base text-pa-ink">{value ?? <span className="text-pa-ink-2">{t.project.notRecorded}</span>}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-pa-hair bg-pa-surface p-4 sm:p-6">
      <h2 className="pa-heading text-xl font-semibold text-pa-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PublicProjectPage({
  project,
  highlightFeedbackId,
  highlightCommentId,
}: {
  project: PublicProjectDetail;
  highlightFeedbackId?: string;
  highlightCommentId?: string;
}) {
  const place = [project.barangay ? `Brgy. ${project.barangay}` : null, project.municipality, project.province, project.region]
    .filter(Boolean)
    .join(", ") || null;
  const timeline: Array<{ key: string; label: string; date: string }> = [
    { key: "start", label: t.project.timeline.start, date: project.timeline.start },
    { key: "target", label: t.project.timeline.target, date: project.timeline.target },
    { key: "finished", label: t.project.timeline.finished, date: project.timeline.finished },
    { key: "handedOver", label: t.project.timeline.handedOver, date: project.timeline.handedOver },
  ].flatMap((step) => (step.date ? [{ key: step.key, label: step.label as string, date: step.date }] : []));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <ProjectViewTracker projectId={project.code} />
      <Link href="/infra-analytics" className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-pa-accent underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.project.back}
      </Link>

      <header className="space-y-2">
        <p className="pa-mono text-sm text-pa-muted">{project.code}</p>
        <h1 className="pa-heading text-3xl font-semibold text-pa-ink sm:text-4xl">{project.name}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-pa-ink-2">
          <span className="inline-flex items-center gap-2 text-pa-ink"><StageSwatch stage={project.stage} />{t.stages[project.stage]}</span>
          <span>{project.projectType}</span>
        </p>
      </header>

      <Card title={t.project.photosTitle}>
        <PhotoGallery photos={project.photos} projectName={project.name} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t.project.stage}>
          <dl>
            <Fact label={t.project.type} value={project.projectType} />
            <Fact label={t.project.location} value={place} />
            <Fact label={t.project.beneficiary} value={project.beneficiary} />
            <Fact label={t.project.budget} value={project.budget !== null ? formatPesos(project.budget) : null} />
            <Fact label={t.project.contractBudget} value={project.contractBudget !== null ? formatPesos(project.contractBudget) : null} />
            <Fact label={t.project.contractor} value={project.contractor} />
            <Fact label={t.project.budgetYear} value={project.year ? String(project.year) : null} />
            <Fact label={t.project.program} value={project.program} />
            {project.commodities.length > 0 ? <Fact label={t.project.commodities} value={project.commodities.join(", ")} /> : null}
          </dl>
        </Card>

        <div className="space-y-6">
          <Card title={t.project.progressTitle}>
            <p className="text-base text-pa-ink">{format(t.project.progressLabel, { value: project.progress })}</p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={project.progress}
              aria-label={t.project.progressTitle}
              className="mt-2 h-5 w-full rounded-r bg-pa-surface-2"
            >
              <div className="h-full rounded-r" style={{ width: `${project.progress}%`, background: "var(--series)" }} />
            </div>
          </Card>

          <Card title={t.project.timelineTitle}>
            {timeline.length === 0 ? (
              <p className="text-base text-pa-ink-2">{t.project.timelineEmpty}</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((step) => (
                  <li key={step.key} className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                    <span>
                      <span className="block text-sm text-pa-ink-2">{step.label}</span>
                      <span className="text-base text-pa-ink">{formatPublicDate(step.date)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {project.plannedVsActual ? (
        <Card title={t.project.plannedVsActual}>
          <p className="mb-3 text-base text-pa-ink-2">{t.project.plannedVsActualNote}</p>
          <PlannedVsActual points={project.plannedVsActual} />
        </Card>
      ) : null}

      <Card title={t.project.mapTitle}>
        {project.latitude !== null && project.longitude !== null ? (
          <div className="pa-map relative isolate z-0 h-64 overflow-hidden rounded-md border border-pa-hair">
            <LocationMapLoader latitude={project.latitude} longitude={project.longitude} stage={project.stage} label={t.project.mapTitle} />
          </div>
        ) : (
          <p className="text-base text-pa-ink-2">{t.project.noLocation}</p>
        )}
      </Card>

      <ProjectFeedback
        projectId={project.code}
        farmOperation={project.farmOperation}
        highlightFeedbackId={highlightFeedbackId}
        highlightCommentId={highlightCommentId}
      />
    </div>
  );
}

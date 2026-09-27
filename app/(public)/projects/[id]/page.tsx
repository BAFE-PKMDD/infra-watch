import type { Metadata } from "next";
import Link from "next/link";

import { publicAnalyticsFontClassName } from "@/components/public-analytics/fonts";
import { PublicProjectPage } from "@/components/public-analytics/project/public-project-page";
import { getServerLanguage } from "@/i18n/server";
import { getPublicProjectDetail } from "@/lib/public-analytics/service";
import { getPublicAnalyticsStrings } from "@/lib/public-analytics/strings";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, language] = await Promise.all([params, getServerLanguage()]);
  const project = await getPublicProjectDetail(id).catch(() => null);
  return { title: project ? `${project.name} | InfraWatch` : `${getPublicAnalyticsStrings(language).project.notFound} | InfraWatch` };
}

export default async function ProjectDetailsPage({ params, searchParams }: Props) {
  const [{ id }, query, language] = await Promise.all([params, searchParams, getServerLanguage()]);
  const project = await getPublicProjectDetail(id);
  const t = getPublicAnalyticsStrings(language);

  return (
    <div className={`public-analytics ${publicAnalyticsFontClassName} min-h-screen`}>
      {project ? (
        <PublicProjectPage project={project} t={t} highlightFeedbackId={first(query.feedbackId)} highlightCommentId={first(query.commentId)} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="pa-heading mb-4 text-2xl font-semibold text-pa-ink">{t.project.notFound}</h1>
          <p className="mb-6 text-base text-pa-ink-2">{t.project.notFoundBody}</p>
          <Link href="/infra-analytics" className="inline-flex min-h-11 items-center rounded-md bg-pa-accent px-4 text-base font-medium text-pa-surface">
            {t.project.back}
          </Link>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";

import { SmsGrievanceGuide } from "@/components/report-issue/sms-grievance-guide";
import { getServerLanguage, getServerTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("eReport.smsPage.metaTitle"),
    description: t("eReport.smsPage.metaDescription"),
  };
}

export default async function SmsGrievancePage() {
  // The guide keeps its own English/Filipino switch; it starts in the site language, and the
  // key remounts it when the header switch changes that language.
  const language = await getServerLanguage();
  return <SmsGrievanceGuide key={language} initialLanguage={language} />;
}

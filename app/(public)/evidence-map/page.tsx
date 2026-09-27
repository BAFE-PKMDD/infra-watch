import type { Metadata } from "next";

import { SystemEvidenceMapClient } from "@/components/shared/system-evidence-map-client";
import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("community.evidenceMapPage.metaTitle"),
    description: t("community.evidenceMapPage.metaDescription"),
  };
}

export default function EvidenceMapPage() {
  return <SystemEvidenceMapClient />;
}

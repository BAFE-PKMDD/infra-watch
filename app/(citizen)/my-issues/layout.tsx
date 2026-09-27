import type { Metadata } from "next";

import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("account.issues.metaTitle"),
    description: t("account.issues.metaDescription"),
  };
}

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

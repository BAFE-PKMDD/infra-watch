import type { Metadata } from "next";

import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("account.feedbacks.metaTitle"),
    description: t("account.feedbacks.metaDescription"),
  };
}

export default function FeedbacksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

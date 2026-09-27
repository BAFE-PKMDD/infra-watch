import type { Metadata } from "next";

import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("account.notifications.metaTitle"),
    description: t("account.notifications.metaDescription"),
  };
}

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

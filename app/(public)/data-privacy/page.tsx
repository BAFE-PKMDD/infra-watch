import type { Metadata } from "next";

import { getServerLanguage } from "@/i18n/server";

import { DataPrivacyView } from "./data-privacy-view";

export const metadata: Metadata = {
  title: "Privacy Notice | InfraWatch",
  description: "How InfraWatch handles account, feedback, evidence, and service-security information.",
};

export default async function DataPrivacyPage() {
  return <DataPrivacyView language={await getServerLanguage()} />;
}

import type { Metadata } from "next";

import { getServerLanguage } from "@/i18n/server";

import { DataDeletionView } from "./data-deletion-view";

export const metadata: Metadata = {
  title: "Request Data Deletion | InfraWatch",
  description: "How to request review and deletion of eligible personal information held by InfraWatch.",
};

export default async function DataDeletionPage() {
  return <DataDeletionView language={await getServerLanguage()} />;
}

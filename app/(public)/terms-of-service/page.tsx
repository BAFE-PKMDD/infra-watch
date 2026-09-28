import type { Metadata } from "next";

import { getServerLanguage } from "@/i18n/server";

import { TermsOfServiceView } from "./terms-of-service-view";

export const metadata: Metadata = {
  title: "Terms of Service | InfraWatch",
  description: "Terms governing access to and use of the InfraWatch platform.",
};

export default async function TermsOfServicePage() {
  return <TermsOfServiceView language={await getServerLanguage()} />;
}

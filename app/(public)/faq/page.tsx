import type { Metadata } from "next";

import { getServerLanguage } from "@/i18n/server";
import { FAQ_PAGE_COPY } from "@/lib/faq-content";

import { FaqView } from "./faq-view";

export async function generateMetadata(): Promise<Metadata> {
  const copy = FAQ_PAGE_COPY[await getServerLanguage()];
  return { title: copy.metaTitle, description: copy.metaDescription };
}

export default async function FaqPage() {
  return <FaqView language={await getServerLanguage()} />;
}

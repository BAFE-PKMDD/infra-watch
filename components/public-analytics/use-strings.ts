"use client";

import { getPublicAnalyticsStrings } from "@/lib/public-analytics/strings";
import { useLanguage } from "@/providers/language-provider";

/**
 * The public analytics strings in the visitor's EN/TL choice, for client components.
 * Server components use getPublicAnalyticsStrings(await getServerLanguage()) instead.
 */
export function usePublicAnalyticsStrings() {
  const { language } = useLanguage();
  return getPublicAnalyticsStrings(language);
}

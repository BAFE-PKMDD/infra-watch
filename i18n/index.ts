"use client";

import { useLanguage } from "@/providers/language-provider";
import { translate } from "./translate";

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  const t = <T = string>(path: string, variables?: Record<string, string | number>): T =>
    translate<T>(language, path, variables);

  return { t, language, setLanguage };
}

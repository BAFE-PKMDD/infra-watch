"use client";

import { useLanguage } from "@/providers/language-provider";
import { translations, TranslationKeys } from "./translations";

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  // Simple translation function that handles 2-level nesting and variable replacement
  const t = (path: string, variables?: Record<string, string | number>): any => {
    const keys = path.split(".");
    let result: any = translations[language];

    for (const key of keys) {
      if (result && typeof result === "object" && key in result) {
        result = result[key];
      } else {
        console.warn(`Translation key not found: ${path}`);
        return path;
      }
    }

    if (typeof result === "string" && variables) {
      return Object.entries(variables).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{${key}}`, "g"), String(value));
      }, result);
    }

    return result;
  };

  return { t, language, setLanguage };
}

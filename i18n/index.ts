"use client";

import { useLanguage } from "@/providers/language-provider";
import { translations } from "./translations";

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  // Simple translation function that handles 2-level nesting and variable replacement
  const t = <T = string>(path: string, variables?: Record<string, string | number>): T => {
    const keys = path.split(".");
    let result: unknown = translations[language];

    for (const key of keys) {
      if (result && typeof result === "object" && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        console.warn(`Translation key not found: ${path}`);
        return path as T;
      }
    }

    if (typeof result === "string" && variables) {
      return Object.entries(variables).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{${key}}`, "g"), String(value));
      }, result) as T;
    }

    return result as T;
  };

  return { t, language, setLanguage };
}

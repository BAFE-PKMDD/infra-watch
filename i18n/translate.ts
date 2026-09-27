import { translations, type Language } from "./translations";

export const LANGUAGE_COOKIE = "language";

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "tl";
}

/**
 * Looks up a dotted key ("landing.hero.title") in the dictionary for `language` and fills
 * {name} placeholders. Shared by the client hook (useTranslation) and server components
 * (getServerTranslator), so both resolve keys the same way. A missing key returns the key
 * itself so a gap is visible on the page instead of rendering nothing.
 */
export function translate<T = string>(
  language: Language,
  path: string,
  variables?: Record<string, string | number>,
): T {
  let result: unknown = translations[language];
  for (const key of path.split(".")) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      console.warn(`Translation key not found: ${path}`);
      return path as T;
    }
  }

  if (typeof result === "string" && variables) {
    return Object.entries(variables).reduce(
      (text, [key, value]) => text.replace(new RegExp(`{${key}}`, "g"), String(value)),
      result,
    ) as T;
  }

  return result as T;
}

import "server-only";

import { cookies } from "next/headers";

import { LANGUAGE_COOKIE, isLanguage, translate } from "./translate";
import type { Language } from "./translations";

/**
 * The visitor's language for server components. LanguageProvider mirrors the choice saved
 * in localStorage into the `language` cookie and refreshes the route, so server-rendered
 * text follows the same EN/TL switch as client components. Reading cookies makes the page
 * dynamic.
 */
export async function getServerLanguage(): Promise<Language> {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLanguage(value) ? value : "en";
}

export async function getServerTranslator() {
  const language = await getServerLanguage();
  const t = <T = string>(path: string, variables?: Record<string, string | number>) => translate<T>(language, path, variables);
  return { t, language };
}

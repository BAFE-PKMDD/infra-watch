import { ChevronDown } from "lucide-react";

import { PublicInformationPage } from "@/components/layout/public-information-page";
import type { Language } from "@/i18n/translations";
import { FAQ_PAGE_COPY, getFaqEntries } from "@/lib/faq-content";

/** The FAQ accordion in `language`; page.tsx picks the language from the visitor's cookie. */
export function FaqView({ language }: { language: Language }) {
  const copy = FAQ_PAGE_COPY[language];
  return (
    <PublicInformationPage eyebrow={copy.eyebrow} title={copy.title} description={copy.description} language={language}>
      <div className="not-prose divide-y divide-slate-200 border-y border-slate-200">
        {getFaqEntries(language).map((entry) => (
          <details key={entry.question} className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden">
              <h2 className="text-base font-semibold text-slate-950 sm:text-lg">{entry.question}</h2>
              <ChevronDown className="size-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <p className="pb-5 pr-9 text-base leading-7 text-slate-700">{entry.answer}</p>
          </details>
        ))}
      </div>
    </PublicInformationPage>
  );
}

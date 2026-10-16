"use client";

import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSuggestion } from "@/actions/mutation/suggestion.mutation";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { SUGGESTION_CATEGORIES, type SuggestionField, type SuggestionInput } from "@/lib/suggestions";

const controlClass = "min-h-11 w-full rounded-md border border-slate-500 bg-background px-3 py-2 text-base text-foreground placeholder:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:text-sm dark:border-slate-400 dark:placeholder:text-slate-400";
const linkClass = "inline-flex min-h-11 items-center rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-indigo-300";

export function SuggestionsView() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SuggestionField, string>>>({});
  const submitting = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as SuggestionInput;
    submitting.current = true;
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await createSuggestion(values);
      if (result.success) {
        form.reset();
        setSubmitted(true);
      } else {
        const errors = result.fieldErrors ?? {};
        setFieldErrors(errors);
        setError(Object.keys(errors).length ? t("suggestions.validationError") : result.message);
        const firstInvalid = Object.keys(errors)[0];
        if (firstInvalid) requestAnimationFrame(() => form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus());
      }
    } catch {
      setError(t("suggestions.error"));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function errorProps(field: SuggestionField, hint?: string) {
    return {
      "aria-invalid": Boolean(fieldErrors[field]),
      "aria-describedby": [hint, fieldErrors[field] ? `${field}-error` : null].filter(Boolean).join(" ") || undefined,
    };
  }

  function fieldError(field: SuggestionField) {
    return fieldErrors[field] ? <p id={`${field}-error`} className="text-sm text-red-700 dark:text-red-300">{fieldErrors[field]}</p> : null;
  }

  return (
    <div className="bg-slate-50 text-foreground dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-background dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("suggestions.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">{t("suggestions.description")}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-10">
        <section aria-labelledby="suggestion-form-title" className="min-w-0 rounded-lg border border-slate-200 bg-background p-5 sm:p-8 dark:border-slate-800">
          {submitted ? (
            <div role="status" className="py-6">
              <CheckCircle2 aria-hidden="true" className="mb-4 h-8 w-8 text-green-700 dark:text-green-300" />
              <h2 id="suggestion-form-title" ref={successHeading} tabIndex={-1} className="text-xl font-semibold focus-visible:outline-2 focus-visible:outline-primary">{t("suggestions.successTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t("suggestions.successBody")}</p>
              <Button type="button" className="mt-6 min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setSubmitted(false)}>{t("suggestions.sendAnother")}</Button>
            </div>
          ) : (
            <>
              <h2 id="suggestion-form-title" className="text-xl font-semibold">{t("suggestions.formTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("suggestions.required")}</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5" aria-busy={pending}>
                <fieldset disabled={pending} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="suggestion-category" className="block text-sm font-semibold">{t("suggestions.category")}</label>
                    <select id="suggestion-category" name="category" defaultValue="suggestion" required className={controlClass} {...errorProps("category")}>
                      {SUGGESTION_CATEGORIES.map(category => <option key={category} value={category}>{t(`suggestions.categories.${category}`)}</option>)}
                    </select>
                    {fieldError("category")}
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="suggestion-name" className="block text-sm font-semibold">{t("suggestions.name")}</label>
                      <input id="suggestion-name" name="name" autoComplete="name" required maxLength={120} className={controlClass} {...errorProps("name")} />
                      {fieldError("name")}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="suggestion-email" className="block text-sm font-semibold">{t("suggestions.email")}</label>
                      <input id="suggestion-email" name="email" type="email" autoComplete="email" required maxLength={254} className={controlClass} {...errorProps("email", "suggestion-email-hint")} />
                      <p id="suggestion-email-hint" className="text-sm text-slate-600 dark:text-slate-300">{t("suggestions.emailHint")}</p>
                      {fieldError("email")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="suggestion-subject" className="block text-sm font-semibold">{t("suggestions.subject")}</label>
                    <input id="suggestion-subject" name="subject" required maxLength={160} placeholder={t("suggestions.subjectPlaceholder")} className={controlClass} {...errorProps("subject")} />
                    {fieldError("subject")}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="suggestion-message" className="block text-sm font-semibold">{t("suggestions.message")}</label>
                    <textarea id="suggestion-message" name="message" required minLength={10} maxLength={5000} rows={6} placeholder={t("suggestions.messagePlaceholder")} className={`${controlClass} resize-y`} {...errorProps("message", "suggestion-message-hint")} />
                    <p id="suggestion-message-hint" className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("suggestions.messageHint")}</p>
                    {fieldError("message")}
                  </div>
                  <div hidden aria-hidden="true">
                    <label htmlFor="suggestion-website">Website</label>
                    <input id="suggestion-website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                </fieldset>
                {error ? <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <Link href="/data-privacy" className={`${linkClass} text-sm`}>{t("suggestions.privacy")}</Link>
                  <Button type="submit" disabled={pending} className="min-h-11 px-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Send aria-hidden="true" className="h-4 w-4" />
                    {t(pending ? "suggestions.sending" : "suggestions.submit")}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
        <aside className="min-w-0 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-foreground">{t("suggestions.reviewTitle")}</h2>
            <p className="mt-3">{t("suggestions.reviewBody")}</p>
          </section>
          <section className="border-t border-slate-300 pt-6 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-foreground">{t("suggestions.projectTitle")}</h2>
            <p className="mt-3">{t("suggestions.projectBody")}</p>
            <div className="mt-3 flex flex-col items-start">
              <Link href="/report-issue" className={linkClass}>{t("suggestions.reportLink")}</Link>
              <Link href="/projects" className={linkClass}>{t("suggestions.projectsLink")}</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

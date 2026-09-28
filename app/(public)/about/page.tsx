"use client";

import { motion } from "motion/react";
import { useTranslation } from "@/i18n";
import Image from "next/image";
import Link from "next/link";
import { getBlurDataURL } from "@/lib/image-utils";
import { ExternalLink } from "lucide-react";
import { BluecopyBook } from "@/components/about/bluecopy-book";
import { AdministrativeOrderBook } from "@/components/about/administrative-order-book";
import { LguGuidebook } from "@/components/about/lgu-guidebook";
import { HistorySection } from "@/components/about/history-section";

export default function AboutPage() {
  const { t } = useTranslation();
  const mandateFunctions = t<{ title: string; desc: string }[]>("about.mandate.functions");
  const functionsList = Array.isArray(mandateFunctions) ? mandateFunctions : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-[#0d1526]/30 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative h-[280px] overflow-hidden bg-blue-950 dark:bg-[#0d1526]">
        <div className="absolute inset-0">
          <Image
            src="/irrigation.png"
            alt={t("about.heroImageAlt")}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover opacity-60 dark:opacity-10 contrast-[1.05] transition-opacity duration-300"
            priority
            placeholder="blur"
            blurDataURL={getBlurDataURL(1920, 1080)}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1526]/90 via-[#13233c]/85 to-[#1e3a5f]/90 dark:from-[#0d1526]/95 dark:via-[#0d1526]/90 dark:to-[#1e3a5f]/95" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-amber-300 text-xs font-semibold tracking-[0.3em] uppercase mb-2">
              {t("about.subtitle")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {t("about.title")}
            </h1>
            <p className="text-slate-100 max-w-3xl text-sm md:text-base leading-relaxed opacity-90">
              {t("about.description")}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
        {/* History Section */}
        <HistorySection />

        {/* Mission & Vision Section - Unified Full-Width Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 md:p-8 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 md:divide-x md:divide-slate-200 dark:md:divide-[#1e3a5f]/30">
            <div className="flex flex-col items-start space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {t("about.mission.title")}
              </h2>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {t("about.mission.desc")}
              </p>
            </div>
            <div className="flex flex-col items-start space-y-2 md:pl-12">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {t("about.vision.title")}
              </h2>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {t("about.vision.desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Mandate & Functions Section */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 md:p-8 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30 relative overflow-hidden">
          {/* Subtle BAFE Seal Watermark */}
          <div className="absolute -right-8 -bottom-8 w-64 h-64 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Image
              src="/bafe-logo.png"
              alt=""
              fill
              sizes="256px"
              className="object-contain"
            />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-14 h-14 flex-shrink-0">
                <Image
                  src="/bafe-logo.png"
                  alt={t("about.sealAlt")}
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 tracking-wide uppercase">
                  {t("about.mandate.legalBasis")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {t("about.mandate.title")}
                </h2>
              </div>
            </div>

            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
              {t("about.mandate.desc")}
            </p>

            {functionsList.length > 0 && (
              <div className="pt-6 border-t border-slate-200 dark:border-[#1e3a5f]/30">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-6">
                  {t("about.mandate.functionsTitle")}
                </h3>
                <ol className="divide-y divide-slate-100 dark:divide-[#1e3a5f]/20">
                  {functionsList.map((fn, idx) => (
                    <li key={idx} className="py-4 first:pt-0 last:pb-0 flex gap-4 sm:gap-5 items-start">
                      <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400 pt-0.5 select-none flex-shrink-0">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                          {fn.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {fn.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Know More About BAFE Banner */}
        <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-5 md:p-6 dark:border-[#1e3a5f]/40 dark:bg-gradient-to-r dark:from-[#0d1526] dark:via-[#13233c]/40 dark:to-[#0d1526] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src="/bafe-logo.png"
                alt={t("about.sealAlt")}
                fill
                sizes="48px"
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t("about.bafeSite.title")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {t("about.bafeSite.desc")}
              </p>
            </div>
          </div>
          <a
            href="https://www.bafe.gov.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all transform active:scale-95 whitespace-nowrap self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span>{t("about.bafeSite.cta")}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Reference Publications Section Header */}
        <div className="pt-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("about.publications.title")}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("about.publications.desc")}
          </p>
        </div>

        {/* Bluecopy Book Section */}
        <BluecopyBook />

        {/* Administrative Order No. 4 Section */}
        <AdministrativeOrderBook />

        {/* LGU Guidebook Section */}
        <LguGuidebook />

        {/* CTA Section */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30">
          <div>
            <h3 className="text-xl font-semibold mb-1 text-slate-900 dark:text-white">{t("about.cta.title")}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("about.cta.desc")}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/report-issue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm"
            >
              {t("about.cta.report")}
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors dark:border-[#1e3a5f]/40 dark:text-slate-300 dark:hover:bg-[#13233c]/50"
            >
              {t("about.cta.projects")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

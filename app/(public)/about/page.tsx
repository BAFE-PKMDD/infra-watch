"use client";

import { motion } from "motion/react";
import { useTranslation } from "@/i18n";
import { Target, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getBlurDataURL } from "@/lib/image-utils";
import { BluecopyBook } from "@/components/about/bluecopy-book";
import { AdministrativeOrderBook } from "@/components/about/administrative-order-book";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-[#0d1526]/30 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative h-[280px] overflow-hidden bg-blue-950 dark:bg-[#0d1526]">
        <div className="absolute inset-0">
          <Image
            src="/irrigation.png"
            alt="About Infra Watch"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Mission & Vision Section - Using Minimalist Card Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30 flex flex-col items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-5 text-orange-600 dark:text-orange-400">
              <Target className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t("about.mission.title")}</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {t("about.mission.desc")}
            </p>
          </motion.div>

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30 flex flex-col items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-5 text-teal-600 dark:text-teal-400">
              <Eye className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t("about.vision.title")}</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {t("about.vision.desc")}
            </p>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-[#1e3a5f]/20" />

        {/* Bluecopy Book Section */}
        <BluecopyBook />

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-[#1e3a5f]/20" />

        {/* Administrative Order No. 4 Section */}
        <AdministrativeOrderBook />

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-[#1e3a5f]/20" />

        {/* CTA Section */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30">
          <div>
            <h3 className="text-xl font-semibold mb-1 text-slate-900 dark:text-white">Ready to report?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Join other citizens in monitoring infrastructure in your area.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/report-issue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm animate-pulse hover:animate-none"
            >
              Start Reporting
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors dark:border-[#1e3a5f]/40 dark:text-slate-300 dark:hover:bg-[#13233c]/50"
            >
              View Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

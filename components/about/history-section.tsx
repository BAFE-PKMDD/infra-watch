"use client";

import { motion } from "motion/react";
import { useTranslation } from "@/i18n";

type Milestone = {
  year: string;
  title: string;
  desc: string;
};

export function HistorySection() {
  const { t } = useTranslation();
  const intro = t<string[]>("about.history.intro");
  const milestones = t<Milestone[]>("about.history.milestones");
  const introParagraphs = Array.isArray(intro) ? intro : [];
  const milestoneList = Array.isArray(milestones) ? milestones : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl bg-white border border-slate-200 p-6 md:p-8 dark:bg-[#0d1526] dark:border-[#1e3a5f]/30"
    >
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 dark:border-[#1e3a5f]/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
          {t("about.history.eyebrow")}
        </p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          {t("about.history.agencyName")}
        </h2>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("about.history.acronym")}</p>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Est. <span className="font-semibold text-slate-900 dark:text-white">{t("about.history.est")}</span>
          </p>
          <p>
            Legal: <span className="font-semibold text-slate-900 dark:text-white">{t("about.history.legal")}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 max-w-4xl space-y-4">
        {introParagraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-base">
            {paragraph}
          </p>
        ))}
      </div>

      {milestoneList.length > 0 && (
        <div className="mt-10 border-t border-slate-200 pt-8 dark:border-[#1e3a5f]/30">
          <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
            {t("about.history.milestonesLabel")}
          </h3>
          <ol className="relative space-y-8 border-l-2 border-slate-200 pl-6 dark:border-[#1e3a5f]/40">
            {milestoneList.map((milestone) => (
              <li key={`${milestone.year}-${milestone.title}`} className="relative">
                <span className="absolute -left-[1.95rem] top-1 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-white dark:bg-blue-400 dark:ring-[#0d1526]" />
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{milestone.year}</p>
                <h4 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">{milestone.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{milestone.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-8 max-w-4xl border-t border-slate-200 pt-6 text-sm italic leading-relaxed text-slate-600 dark:border-[#1e3a5f]/30 dark:text-slate-400">
        {t("about.history.closing")}
      </p>
    </motion.div>
  );
}

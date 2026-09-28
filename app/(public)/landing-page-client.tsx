"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Droplets, Tractor } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import { PublicPortfolioStatistics } from "@/components/public/public-portfolio-statistics";
import { CitizenFeedbackSpotlight } from "@/components/public/citizen-feedback-spotlight";
import { PhilippinesRegionsMap } from "@/components/public/philippines-regions-map";
import { LiveVideoPopup } from "@/components/landing/live-video-popup";
import { HowItWorksScroll } from "@/components/landing/how-it-works-scroll";
import { ReportingChannelsHowItWorks } from "@/components/landing/reporting-channels-how-it-works";
import type { PublicLiveVideo } from "@/types/live-video.types";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";
import type { GeoFeatureCollection } from "@/lib/geojson-to-svg-path";

const STATS_REVEAL_DELAY = 2.2;

export function LandingPageClient({
  initialAnalytics,
  liveVideo = null,
  feedbackHighlights = [],
  provincesMap = null,
}: {
  initialAnalytics: InfraAnalyticsResult;
  liveVideo?: PublicLiveVideo | null;
  feedbackHighlights?: FeedbackActivityItem[];
  provincesMap?: GeoFeatureCollection | null;
}) {
  const { t } = useTranslation();
  const programs = [
    {
      code: "AMEFSS",
      icon: Tractor,
      title: "Agricultural Machinery, Equipment and Facilities Support Services",
      desc: t("landing.programs.amefss.description"),
      href: "/projects?program=amefip",
      cta: t("landing.programs.amefss.cta"),
      topBar: "from-indigo-600 via-sky-500 to-indigo-600",
      medallion: "bg-indigo-50 text-primary dark:bg-indigo-950/60 dark:text-indigo-300",
      chip: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300",
      btn: "w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-auto min-h-10 whitespace-normal py-2 text-center rounded-lg flex items-center justify-center",
    },
    {
      code: "INS",
      icon: Droplets,
      title: "Irrigation Network Services",
      desc: t("landing.programs.ins.description"),
      href: "/projects?program=ins",
      cta: t("landing.programs.ins.cta"),
      topBar: "from-indigo-600 via-sky-500 to-indigo-600",
      medallion: "bg-indigo-50 text-primary dark:bg-indigo-950/60 dark:text-indigo-300",
      chip: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300",
      btn: "w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-auto min-h-10 whitespace-normal py-2 text-center rounded-lg flex items-center justify-center",
    },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-blue-950 text-white">
        {/* Layer 1 — Main Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero/main-background.png"
            alt={t("landing.hero.backgroundAlt")}
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/75 via-blue-950/65 to-slate-950/70 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-950/90" />
        </div>

        {/* Silhouette Overlay Patterns */}
        <div className="absolute inset-0">
          {/* Layer 2 — Left Bottom Overlay */}
          <motion.div
            className="absolute left-0 bottom-0 w-[45%] md:w-[50%] lg:w-[55%] h-[75%] md:h-[90%] opacity-20 md:opacity-25 pointer-events-none select-none z-0 hidden sm:block bg-blue-950/40 dark:bg-slate-950/40"
            style={{
              maskImage: "linear-gradient(to right, black 15%, transparent 80%), linear-gradient(to top, black 20%, transparent 80%)",
              WebkitMaskImage: "linear-gradient(to right, black 15%, transparent 80%), linear-gradient(to top, black 20%, transparent 80%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/hero/lower_left.jpg"
              alt=""
              fill
              className="object-contain object-left-bottom grayscale-[0.5] contrast-[1.2] brightness-[0.7] mix-blend-overlay -scale-x-100"
              loading="eager"
              quality={70}
              sizes="(min-width: 1024px) 55vw, (min-width: 768px) 50vw, (min-width: 640px) 45vw, 1px"
            />
          </motion.div>

          {/* Layer 3 — Left Top Overlay */}
          <motion.div
            className="absolute left-0 top-0 w-[40%] md:w-[45%] lg:w-[50%] h-[50%] md:h-[60%] opacity-20 md:opacity-25 pointer-events-none select-none z-0 hidden sm:block bg-blue-950/30 dark:bg-slate-950/30"
            style={{
              maskImage: "linear-gradient(to right, black 15%, transparent 75%), linear-gradient(to bottom, black 15%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to right, black 15%, transparent 75%), linear-gradient(to bottom, black 15%, transparent 75%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            initial={{ opacity: 0, y: -40, x: -40 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 3, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/hero/top_left.jpg"
              alt=""
              fill
              className="object-cover object-left-top grayscale-[0.5] contrast-[1.15] brightness-[0.75] mix-blend-overlay -scale-x-100"
              loading="eager"
              quality={70}
              sizes="(min-width: 1024px) 50vw, (min-width: 768px) 45vw, (min-width: 640px) 40vw, 1px"
            />
          </motion.div>

          {/* Layer 4 — Right Bottom Overlay */}
          <motion.div
            className="absolute right-0 bottom-[-10%] w-[45%] md:w-[50%] lg:w-[55%] h-[75%] md:h-[90%] opacity-35 md:opacity-40 pointer-events-none select-none z-0 hidden sm:block bg-blue-950/40 dark:bg-slate-900/40"
            style={{
              maskImage: "linear-gradient(to left, black 10%, transparent 80%), linear-gradient(to top, black 40%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 80%), linear-gradient(to top, black 40%, transparent 95%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/hero/lower_right.jpg"
              alt=""
              fill
              className="object-cover object-right-bottom grayscale-[0.5] contrast-[1.2] brightness-[0.7] mix-blend-overlay"
              loading="eager"
              quality={90}
              sizes="(min-width: 1024px) 55vw, (min-width: 768px) 50vw, (min-width: 640px) 45vw, 1px"
            />
          </motion.div>

          {/* Layer 5 — Right Top Overlay */}
          <motion.div
            className="absolute right-0 top-0 w-[40%] md:w-[45%] lg:w-[50%] h-[50%] md:h-[60%] opacity-20 md:opacity-25 pointer-events-none select-none z-0 hidden sm:block bg-blue-950/25 dark:bg-slate-900/25"
            style={{
              maskImage: "linear-gradient(to left, black 15%, transparent 75%), linear-gradient(to bottom, black 15%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to left, black 15%, transparent 75%), linear-gradient(to bottom, black 15%, transparent 75%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            initial={{ opacity: 0, y: -40, x: 40 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 3, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/hero/top_right.jpg"
              alt=""
              fill
              className="object-cover object-right-top grayscale-[0.5] contrast-[1.15] brightness-[0.75] mix-blend-overlay"
              loading="eager"
              quality={70}
              sizes="(min-width: 1024px) 50vw, (min-width: 768px) 45vw, (min-width: 640px) 40vw, 1px"
            />
          </motion.div>

          {/* Infrastructure Silhouettes SVG — Bottom */}
          <motion.svg
            className="absolute bottom-0 left-0 w-full h-48 md:h-64 opacity-10"
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 0.1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.path d="M0 150 Q200 130 400 140 T800 145 L1200 150 L1200 200 L0 200 Z" fill="white" opacity="0.3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }} />
            <motion.path d="M0 165 Q300 155 600 160 T1200 165 L1200 200 L0 200 Z" fill="white" opacity="0.4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.7, ease: "easeInOut" }} />
            <motion.rect x="100" y="100" width="50" height="100" fill="white" opacity="0.5" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1, ease: [0.22, 1, 0.36, 1] }} />
            <motion.rect x="180" y="120" width="40" height="80" fill="white" opacity="0.4" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }} />
            <motion.rect x="650" y="90" width="60" height="110" fill="white" opacity="0.5" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.2, ease: [0.22, 1, 0.36, 1] }} />
            <motion.rect x="740" y="110" width="45" height="90" fill="white" opacity="0.4" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.3, ease: [0.22, 1, 0.36, 1] }} />
            <motion.rect x="1000" y="105" width="55" height="95" fill="white" opacity="0.5" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.4, ease: [0.22, 1, 0.36, 1] }} />
            <motion.polygon points="125,100 75,100 100,70" fill="white" opacity="0.5" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 0.6, delay: 1.5, ease: "easeOut" }} />
            <motion.polygon points="675,90 635,90 655,55" fill="white" opacity="0.5" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 0.6, delay: 1.6, ease: "easeOut" }} />
            <motion.polygon points="1027,105 973,105 1000,75" fill="white" opacity="0.5" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 0.6, delay: 1.7, ease: "easeOut" }} />
          </motion.svg>

          {/* Top Corner SVG Elements */}
          <motion.svg
            className="absolute top-0 right-0 w-96 h-96 opacity-8"
            viewBox="0 0 400 400"
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 0.08, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.circle cx="350" cy="50" r="80" fill="white" opacity="0.15" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }} />
            <motion.rect x="320" y="150" width="60" height="100" fill="white" opacity="0.2" initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1, ease: [0.22, 1, 0.36, 1] }} />
            <motion.polygon points="350,150 290,150 320,100" fill="white" opacity="0.2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 0.2, y: 0 }} transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }} />
          </motion.svg>

          {/* Decorative Lines — Government Style */}
          <motion.div
            className="absolute top-0 left-0 right-0 mx-auto w-3/4 h-1 bg-amber-400/30 dark:bg-blue-500/20"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 mx-auto w-3/4 h-1 bg-amber-400/40 dark:bg-blue-400/30"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* Main Content */}
        <div className="relative px-4 py-10 sm:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Official Government Seals */}
            <motion.div
              className="mb-6 flex items-center justify-center gap-3 sm:gap-4 md:mb-10 md:gap-6"
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="rounded-xl border-2 border-amber-400/40 bg-white/95 p-2.5 shadow-2xl backdrop-blur-sm dark:border-blue-500/40 dark:bg-slate-800/90 md:rounded-2xl md:p-4"
                initial={{ opacity: 0, x: -60, rotateY: -90 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 80 }}
                whileHover={{ scale: 1.05, rotateZ: 2, transition: { duration: 0.3 } }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <Image
                    src="/bagong-pilipinas-logo.png"
                    alt={t("landing.hero.sealAlt")}
                    width={300}
                    height={120}
                    className="h-14 w-auto sm:h-16 md:h-24 lg:h-28"
                    priority
                  />
                </motion.div>
              </motion.div>

              <motion.div
                className="hidden sm:block w-0.5 h-20 md:h-24 bg-white/40 dark:bg-blue-500/30"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />

              <motion.div
                className="rounded-xl border-2 border-amber-400/40 bg-white/95 p-2.5 shadow-2xl backdrop-blur-sm dark:border-blue-500/40 dark:bg-slate-800/90 md:rounded-2xl md:p-4"
                initial={{ opacity: 0, x: 60, rotateY: 90 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 80 }}
                whileHover={{ scale: 1.05, rotateZ: -2, transition: { duration: 0.3 } }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <Image
                    src="/bafe-logo.png"
                    alt={t("landing.hero.bafeLogoAlt")}
                    width={300}
                    height={120}
                    className="h-14 w-auto sm:h-16 md:h-24 lg:h-28"
                    priority
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-7">
              {/* Department Label */}
              <motion.div
                className="inline-flex max-w-full items-center rounded-md border border-white/30 bg-slate-950 px-3 py-2 dark:border-slate-600/50 dark:bg-slate-900 sm:px-4 sm:py-1.5"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[10px] font-semibold uppercase leading-relaxed tracking-wider text-white sm:text-xs sm:tracking-widest md:text-sm">
                  Department of Agriculture - Bureau of Agricultural and Fisheries Engineering
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <motion.h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight drop-shadow-lg"
                  initial={{ opacity: 0, y: 40, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {"TRANSPARENCY PORTAL".split(" ").map((word, wordIndex) => (
                    <React.Fragment key={word}>
                      {wordIndex > 0 ? " " : null}
                      <span className="inline-block whitespace-nowrap">
                        {word.split("").map((char, charIndex) => (
                          <motion.span
                            key={`${word}-${charIndex}`}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.5,
                              delay: 0.8 + (wordIndex * word.length + charIndex) * 0.03,
                              ease: [0.22, 1, 0.36, 1]
                            }}
                            style={{ display: "inline-block" }}
                          >
                            {char}
                          </motion.span>
                        ))}
                      </span>
                    </React.Fragment>
                  ))}
                </motion.h1>

                <motion.div
                  className="inline-block"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="rounded bg-amber-400 px-4 py-2.5 shadow-md dark:bg-blue-600 sm:px-6 md:px-8 md:py-3">
                    <h2 className="text-xs font-bold uppercase leading-relaxed tracking-wide text-blue-950 dark:text-white sm:text-base md:text-lg lg:text-xl">
                      {t("landing.hero.subtitle")}
                    </h2>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="text-2xl font-bold tracking-wide text-white/90 drop-shadow-lg sm:text-3xl md:text-4xl">
                    2021 &ndash; 2026
                  </span>
                </motion.div>
              </motion.div>

              {/* Statistics */}
              <motion.div
                className="pt-4 pb-2"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, delay: STATS_REVEAL_DELAY, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 80 }}
              >
                <div className="max-w-5xl mx-auto">
                  <PublicPortfolioStatistics result={initialAnalytics} countStartDelay={STATS_REVEAL_DELAY + 0.2} />
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 3.0 }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -30, rotateY: -15 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ duration: 0.8, delay: 3.0, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.05, y: -4, transition: { duration: 0.2, type: "spring", stiffness: 400 } }}
                  whileTap={{ scale: 0.98 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Link
                    href="/projects"
                    className="group inline-flex w-[min(100%,20rem)] items-center justify-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-bold text-blue-950 shadow-xl transition-all duration-200 hover:bg-gray-50 hover:shadow-2xl dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 sm:w-auto sm:min-w-[200px] md:px-10 md:py-4 md:text-base"
                  >
                    <span>{t("landing.hero.explore")}</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30, rotateY: 15 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ duration: 0.8, delay: 3.1, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.05, y: -4, transition: { duration: 0.2, type: "spring", stiffness: 400 } }}
                  whileTap={{ scale: 0.98 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Link
                    href="/report-issue"
                    className="group inline-flex w-[min(100%,20rem)] items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:shadow-xl sm:w-auto sm:min-w-[200px] md:px-10 md:py-4 md:text-base"
                  >
                    <span>{t("landing.hero.eReports")}</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform opacity-70" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Overview */}
      {provincesMap && initialAnalytics.status === "ready" && (
        <section className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <PhilippinesRegionsMap
            provinces={provincesMap}
            regionalStats={initialAnalytics.data.regionalStats}
          />
        </section>
      )}

      {/* Program Coverage Section */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 md:py-28">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{t("landing.programs.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t("landing.programs.description")}
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 md:gap-8">
          {programs.map((program, index) => (
            <motion.div
              key={program.code}
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="h-full"
            >
              <Card className="group relative h-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <div aria-hidden className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${program.topBar}`}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.8, delay: index * 0.12 + 0.15, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-white/5"
                />
                <CardHeader className="relative p-6 pb-4 md:p-8 md:pb-4">
                  <div className="mb-5 flex items-center justify-between">
                    <motion.div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${program.medallion}`}
                      whileHover={{ scale: 1.1, rotate: 6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <program.icon className="h-6 w-6" aria-hidden />
                    </motion.div>
                    <span className={`rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.18em] ${program.chip}`}>
                      {program.code}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold leading-snug text-slate-900 dark:text-white">
                    {program.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative p-6 pt-0 md:p-8 md:pt-0">
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{program.desc}</p>
                </CardContent>
                <CardFooter className="relative border-t border-slate-100 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60 md:p-8">
                  <Link href={program.href} className={cn(buttonVariants({ variant: "default" }), program.btn)}>
                    <span>{program.cta}</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <HowItWorksScroll />

      <ReportingChannelsHowItWorks />

      <CitizenFeedbackSpotlight items={feedbackHighlights} />

      <LiveVideoPopup video={liveVideo} />
    </div>
  );
}

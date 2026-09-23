"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ClipboardCheck, CloudSun, Droplets, MoveHorizontal, Search, Send, ShieldCheck, Tractor, Waves } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import { PublicPortfolioStatistics } from "@/components/public/public-portfolio-statistics";
import { CitizenFeedbackSpotlight } from "@/components/public/citizen-feedback-spotlight";
import { LiveVideoPopup } from "@/components/landing/live-video-popup";
import type { PublicLiveVideo } from "@/types/live-video.types";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";

const STATS_REVEAL_DELAY = 2.2;

export function LandingPageClient({
  initialAnalytics,
  liveVideo = null,
  feedbackHighlights = [],
}: {
  initialAnalytics: InfraAnalyticsResult;
  liveVideo?: PublicLiveVideo | null;
  feedbackHighlights?: FeedbackActivityItem[];
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [sliderDemoPlayed, setSliderDemoPlayed] = useState(false);
  const [sliderInteracted, setSliderInteracted] = useState(false);
  const sliderInteractedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const howItWorksRef = useRef<HTMLElement>(null);
  const isHowItWorksInView = useInView(howItWorksRef, { amount: 0.2 });
  const [tractorStep, setTractorStep] = useState(0);
  const [litStep, setLitStep] = useState<number | null>(0);
  const [tractorVisible, setTractorVisible] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (reduceMotion || !isHowItWorksInView) return;

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const sequence = [
      // 0: Parked at Step 0 (Step 0 lit) -> start driving to Step 1
      { delay: 1800, action: () => { setLitStep(null); setTractorStep(1); } },
      // 1: Arrive at Step 1 after 1400ms drive -> Step 1 lights up
      { delay: 1400, action: () => { setLitStep(1); } },
      // 2: Parked at Step 1 (Step 1 lit) -> start driving to Step 2
      { delay: 1800, action: () => { setLitStep(null); setTractorStep(2); } },
      // 3: Arrive at Step 2 after 1400ms drive -> Step 2 lights up
      { delay: 1400, action: () => { setLitStep(2); } },
      // 4: Parked at Step 2 (Step 2 lit) -> start driving to Step 3
      { delay: 1800, action: () => { setLitStep(null); setTractorStep(3); } },
      // 5: Arrive at Step 3 after 1400ms drive -> Step 3 lights up
      { delay: 1400, action: () => { setLitStep(3); } },
      // 6: Parked at Step 3 (Step 3 lit) -> fade out tractor and dim Step 3
      { delay: 2000, action: () => { setLitStep(null); setTractorVisible(false); } },
      // 7: Completely invisible -> instant snap back to start (0ms duration)
      { delay: 350, action: () => { setIsResetting(true); setTractorStep(0); } },
      // 8: Restore forward animation and fade in at Step 0
      { delay: 100, action: () => { setIsResetting(false); setTractorVisible(true); setLitStep(0); } },
    ];

    let stepIndex = 0;

    const runNext = () => {
      const current = sequence[stepIndex];
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        current.action();
        stepIndex = (stepIndex + 1) % sequence.length;
        runNext();
      }, current.delay);
    };

    setTractorStep(0);
    setLitStep(0);
    setTractorVisible(true);
    setIsResetting(false);
    runNext();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [reduceMotion, isHowItWorksInView]);

  const runSliderDemo = () => {
    if (sliderDemoPlayed || reduceMotion) return;
    setSliderDemoPlayed(true);
    const keyframes = [50, 26, 74, 50];
    keyframes.forEach((pos, i) => {
      window.setTimeout(() => {
        if (!sliderInteractedRef.current) setSliderPosition(pos);
      }, 500 + i * 650);
    });
  };

  const programs = [
    {
      code: "AMEFSS",
      icon: Tractor,
      title: "Agricultural Machinery, Equipment and Facilities Support Services",
      desc: "Provision of post-harvest facilities, grain dryers, storage warehouses, tractors, and sorting/processing equipment directly to farmer cooperatives to secure food supply chains.",
      href: "/projects?program=amefip",
      cta: "View AMEFSS Projects",
      topBar: "from-indigo-600 via-sky-500 to-indigo-600",
      medallion: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-blue-300",
      chip: "border-slate-300 bg-white/60 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
      btn: "w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-lg flex items-center justify-center dark:bg-blue-600 dark:hover:bg-blue-500",
    },
    {
      code: "INS",
      icon: Droplets,
      title: "Irrigation Network Services",
      desc: "Rehabilitation and construction of diversion dams, concrete distribution canals, solar powered water pumps, and local irrigation systems supporting farmer fields.",
      href: "/projects?program=ins",
      cta: "View INS Projects",
      topBar: "from-indigo-600 via-sky-500 to-indigo-600",
      medallion: "bg-indigo-50 text-primary dark:bg-indigo-950/60 dark:text-indigo-300",
      chip: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300",
      btn: "w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-10 rounded-lg flex items-center justify-center",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: Search,
      title: "Explore Database",
      desc: "Browse agricultural and irrigation infrastructure projects. Filter by sub-program, budget, region, and status.",
    },
    {
      num: "02",
      icon: ClipboardCheck,
      title: "Inspect Site Details",
      desc: "Review coordinates, physical vs. financial progress, and the official program of works.",
    },
    {
      num: "03",
      icon: Send,
      title: "Report or Give Feedback",
      desc: "Rate a project and upload geotagged photos on the Citizen Feed, file a detailed Online E-Report, or send an SMS Grievance if you're offline.",
      methods: ["Citizen Feed", "Online E-Report", "SMS Grievance"],
    },
    {
      num: "04",
      icon: ShieldCheck,
      title: "Resolve Reported Issues",
      desc: "Government moderators investigate citizen feedback and coordinate actions to resolve problems.",
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
            alt="Infrastructure project corridor"
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
                    alt="Bagong Pilipinas Seal"
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
                    alt="DA-BAFE Logo"
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
                      Agricultural and Fisheries Infrastructure Projects
                    </h2>
                  </div>
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
                    <span>Explore Projects</span>
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
                    <span>E-Reports</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform opacity-70" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Coverage Section */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 md:py-28">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Scope & Coverage</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            INFRA Watch aggregates and maps out agricultural and fisheries infrastructure projects under AMEFIP to ensure transparent resource allocation.
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

      {/* Before/After Visual Slider */}
      <section className="border-y border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-950 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center justify-center gap-3">
              <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-amber-600 dark:text-amber-400">Illustrative Outcomes</span>
              <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Before & After</h2>
          </motion.div>

          <div className="grid gap-4 md:hidden">
            <motion.article
              className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-6 text-center shadow-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/60"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <CloudSun aria-hidden className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-400" />
              <span className="mb-3 inline-block rounded-full bg-amber-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">Illustrative Before</span>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Impassable & Dry Canals</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Inoperative systems and dry soil fields prior to government intervention and construction.
              </p>
            </motion.article>
            <motion.article
              className="rounded-2xl border border-primary/25 bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 p-6 text-center shadow-sm dark:border-primary/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <Waves aria-hidden className="mx-auto mb-3 h-8 w-8 text-sky-600 dark:text-sky-400" />
              <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary-foreground">Illustrative After</span>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Modern Concrete Infrastructure</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Operational concrete canal networks flowing with water to irrigate adjacent farmland.
              </p>
            </motion.article>
          </div>

          <motion.div
            className="relative hidden h-[420px] w-full select-none overflow-hidden rounded-3xl border-2 border-slate-200 shadow-xl dark:border-slate-800 lg:h-[480px] md:block"
            initial={{ opacity: 0, scale: 0.96, y: 32 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            onViewportEnter={runSliderDemo}
          >
            {/* Before Stage */}
            <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-amber-50 via-orange-100/70 to-amber-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
              <div aria-hidden className="absolute right-10 top-4 h-32 w-32 rounded-full bg-amber-300/60 blur-2xl dark:bg-amber-500/10" />
              <div aria-hidden className="absolute right-24 top-12 h-12 w-12 rounded-full bg-amber-200 dark:bg-amber-400/20" />
              <svg aria-hidden viewBox="0 0 1000 240" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-44 w-full lg:h-52">
                <path d="M0 96 Q180 76 380 90 T720 86 T1000 92 L1000 240 L0 240 Z" fill="#E2BC85" opacity="0.9" />
                <path d="M0 150 Q250 132 520 146 T1000 140 L1000 240 L0 240 Z" fill="#D3A66C" opacity="0.95" />
                <polygon points="370,118 630,118 585,196 415,196" fill="#C08F55" />
                <polygon points="392,126 608,126 574,188 426,188" fill="#A97843" />
                <g stroke="#8A6134" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.55">
                  <path d="M120 176 l34 -14 l28 12 l36 -16" />
                  <path d="M210 198 l30 -10 l26 10 l32 -12" />
                  <path d="M700 182 l32 -12 l26 10 l34 -14" />
                  <path d="M800 204 l28 -10 l26 8 l30 -12" />
                  <path d="M80 210 l26 -8 l22 8 l28 -10" />
                </g>
                <g stroke="#77602F" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7">
                  <path d="M170 112 q-8 -20 2 -34 q10 12 4 34" />
                  <path d="M255 104 q-6 -16 4 -28 q8 10 2 28" />
                  <path d="M745 108 q-8 -18 0 -32 q10 12 6 32" />
                  <path d="M835 116 q-6 -14 2 -26 q8 10 4 26" />
                </g>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <div className="max-w-md rounded-2xl border border-white/60 bg-white/60 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/70">
                  <span className="inline-block rounded-full bg-amber-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">Illustrative Before</span>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Impassable & Dry Canals</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Inoperative systems and dry soil fields prior to government intervention and construction.
                  </p>
                </div>
              </div>
            </div>

            {/* After Stage */}
            <div
              className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-100 via-teal-50 to-emerald-100 transition-all dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-950"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            >
              <div aria-hidden className="absolute left-10 top-6 h-36 w-36 rounded-full bg-teal-200/60 blur-3xl dark:bg-sky-500/10" />
              <svg aria-hidden viewBox="0 0 1000 240" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-44 w-full lg:h-52">
                <defs>
                  <linearGradient id="infrawatch-water-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7DD3FC" />
                    <stop offset="45%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0369A1" />
                  </linearGradient>
                </defs>
                <path d="M0 92 Q180 74 380 86 T720 82 T1000 90 L1000 240 L0 240 Z" fill="#34D399" opacity="0.35" />
                <path d="M0 128 Q250 112 500 122 T1000 120 L1000 240 L0 240 Z" fill="#4ADE80" opacity="0.45" />
                <polygon points="320,134 680,134 622,216 378,216" fill="#CBD5E1" />
                <polygon points="338,142 662,142 606,208 394,208" fill="url(#infrawatch-water-gradient)" />
                <g stroke="#047857" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.65">
                  <path d="M118 152 q6 -16 16 -24" />
                  <path d="M148 162 q6 -14 14 -22" />
                  <path d="M196 150 q5 -14 13 -21" />
                  <path d="M806 154 q-6 -16 -16 -24" />
                  <path d="M838 164 q-6 -14 -14 -22" />
                  <path d="M884 152 q-5 -14 -13 -21" />
                </g>
                <g stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85">
                  <motion.path d="M420 168 H582" strokeDasharray="16 40" animate={{ strokeDashoffset: [0, -56] }} transition={{ duration: 1.6, ease: "linear", repeat: Infinity }} />
                  <motion.path d="M430 188 H572" strokeDasharray="12 44" animate={{ strokeDashoffset: [0, -56] }} transition={{ duration: 2, ease: "linear", repeat: Infinity }} />
                </g>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <div className="max-w-md rounded-2xl border border-white/60 bg-white/60 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/70">
                  <span className="inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary-foreground">Illustrative After</span>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Modern Concrete Infrastructure</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Operational concrete canal networks flowing with water to irrigate adjacent farmland.
                  </p>
                </div>
              </div>
            </div>

            {/* Stage Labels */}
            <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-md bg-primary px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-md">After · Irrigated</span>
            <span className="pointer-events-none absolute right-4 top-4 z-20 rounded-md bg-amber-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md">Before · Dry</span>

            {/* Slider Control Line */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-20"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute inset-y-0 -translate-x-1/2 w-[3px] bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.2)]" />
              <motion.div
                className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-slate-900 text-white shadow-xl"
                animate={!reduceMotion && !sliderInteracted ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <MoveHorizontal className="h-5 w-5" />
              </motion.div>
            </div>

            {/* Drag hint */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              Drag to compare
            </motion.span>

            {/* Hidden range input overlay for dragging */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => {
                sliderInteractedRef.current = true;
                setSliderInteracted(true);
                setSliderPosition(Number(e.target.value));
              }}
              aria-label="Compare illustrative before and after outcomes"
              className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
            />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section ref={howItWorksRef} className="relative mx-auto max-w-6xl px-4 py-16 md:py-28">
        <motion.div
          className="mx-auto mb-12 max-w-xl text-center md:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">How It Works</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden lg:block">
            <motion.div
              aria-hidden
              className="origin-left border-t-2 border-dashed border-slate-300 dark:border-slate-700"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            {!reduceMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -top-[20px] -translate-x-1/2 text-primary drop-shadow-[0_2px_4px_rgba(79,70,229,0.35)] dark:text-indigo-400 dark:drop-shadow-[0_2px_4px_rgba(129,140,248,0.4)]"
                initial={{ left: "0%", opacity: 1 }}
                animate={{
                  left: `${(tractorStep / 3) * 100}%`,
                  opacity: tractorVisible ? 1 : 0,
                }}
                transition={{
                  left: { duration: isResetting ? 0 : 1.4, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.3 },
                }}
              >
                <motion.div
                  animate={{ y: [0, -1.5, 0] }}
                  transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Tractor className="h-6 w-6" />
                </motion.div>
              </motion.div>
            )}
          </div>
          <div className="grid gap-10 sm:grid-cols-2 md:gap-x-6 lg:grid-cols-4">
            {steps.map((step, index) => {
              const isLit = litStep === index;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex flex-col items-center text-center"
                >
                  <motion.div
                    className={cn(
                      "relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 shadow-sm transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-lg",
                      isLit
                        ? "border-primary bg-primary text-white shadow-md shadow-primary/25 dark:border-indigo-400 dark:bg-indigo-600 dark:text-white dark:shadow-indigo-500/30"
                        : "border-slate-200 bg-slate-50 text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-indigo-300 dark:group-hover:border-primary dark:group-hover:bg-primary dark:group-hover:text-white"
                    )}
                    initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
                    whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: index * 0.12 + 0.2, type: "spring", stiffness: 200, damping: 14 }}
                    whileHover={{ y: -4, rotate: -4 }}
                  >
                    <step.icon className="h-6 w-6" aria-hidden />
                    <motion.span
                      className="absolute -right-2.5 -top-2.5 rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white shadow-md dark:bg-amber-400 dark:text-slate-900"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.4, delay: index * 0.12 + 0.5, type: "spring", stiffness: 300, damping: 12 }}
                    >
                      {step.num}
                    </motion.span>
                  </motion.div>
                  <h3 className="mt-5 font-bold text-base text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{step.desc}</p>
                  {"methods" in step && step.methods && (
                    <ul className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                      {step.methods.map((method) => (
                        <li
                          key={method}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {method}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <CitizenFeedbackSpotlight items={feedbackHighlights} />

      <LiveVideoPopup video={liveVideo} />
    </div>
  );
}

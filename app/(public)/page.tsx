"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [sliderPosition, setSliderPosition] = useState(50);

  // Static Mock Data for INFRA Watch
  const stats = [
    { label: "Total Investment", value: "₱24.5 Billion", desc: "Fiscal Years 2021-2026" },
    { label: "Projects Monitored", value: "19,319", desc: "Machinery, Facilities & Irrigation" },
    { label: "Completion Rate", value: "87.4%", desc: "Average physical progress" },
    { label: "System Length / Qty", value: "12,042 km", desc: "Canals, pipelines, and roads" },
  ];

  const steps = [
    {
      num: "01",
      title: "Explore Database",
      desc: "Browse agricultural machinery, facilities, and irrigation infrastructure projects. Filter by sub-program, budget, region, and status.",
    },
    {
      num: "02",
      title: "Inspect Site Details",
      desc: "Review coordinates, physical vs. financial progress, and the official program of works.",
    },
    {
      num: "03",
      title: "Submit Citizen Feedback",
      desc: "Provide ratings, comments, and upload geotagged photos to verify construction updates.",
    },
    {
      num: "04",
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
              priority
              quality={70}
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
              priority
              quality={70}
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
              priority
              quality={90}
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
              priority
              quality={70}
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
        <div className="relative px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Official Government Seals */}
            <motion.div
              className="flex justify-center items-center gap-4 md:gap-6 mb-8 md:mb-10"
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-2xl border-2 border-amber-400/40 dark:border-blue-500/40"
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
                    className="h-16 md:h-24 lg:h-28 w-auto"
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
                className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-2xl border-2 border-amber-400/40 dark:border-blue-500/40"
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
                    className="h-16 md:h-24 lg:h-28 w-auto"
                    priority
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-7">
              {/* Department Label with Online Badge */}
              <motion.div
                className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/20 dark:bg-slate-800/40 backdrop-blur-sm border border-white/30 dark:border-blue-500/30 rounded-md"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <motion.div
                  className="relative flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 200, damping: 10 }}
                >
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
                  <div className="absolute w-2 h-2 bg-sky-400 rounded-full animate-ping" />
                </motion.div>
                <motion.span
                  className="text-xs md:text-sm font-semibold text-white uppercase tracking-widest"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  Department of Agriculture – Bureau of Agricultural and Fisheries Engineering
                </motion.span>
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
                  {"TRANSPARENCY PORTAL".split("").map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.8 + i * 0.03,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      style={{ display: "inline-block" }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.h1>

                <motion.div
                  className="inline-block"
                  initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 1, delay: 1.4, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.05, rotateZ: 1, transition: { duration: 0.3 } }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    className="bg-amber-400 dark:bg-blue-600 px-6 py-2.5 md:px-8 md:py-3 rounded shadow-xl"
                    animate={{
                      boxShadow: [
                        "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                        "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-blue-950 dark:text-white uppercase tracking-wide">
                      Agricultural and Fisheries Infrastructure Projects
                    </h2>
                  </motion.div>
                </motion.div>

                <motion.p
                  className="text-4xl md:text-5xl text-white/90 dark:text-slate-300 font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {"2021 – 2026".split("").map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 1.8 + i * 0.05,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      style={{ display: "inline-block" }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.p>
              </motion.div>

              {/* Statistics */}
              <motion.div
                className="pt-4 pb-2"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, delay: 2.2, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 80 }}
              >
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 max-w-5xl mx-auto">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 2.3 + i * 0.1 }}
                    >
                      <div className="min-h-32 rounded-xl border border-white/10 bg-white/[0.18] px-4 py-6 text-center shadow-xl backdrop-blur-md">
                        <p className="text-2xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg tabular-nums">{stat.value}</p>
                        <p className="mt-3 text-xs md:text-sm text-white/90 uppercase tracking-wider font-semibold">{stat.label}</p>
                        <p className="mt-2 text-[10px] leading-relaxed text-white/70">{stat.desc}</p>
                      </div>
                    </motion.div>
                  ))}
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
                    className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 md:px-10 md:py-4 bg-white hover:bg-gray-50 dark:bg-blue-600 dark:hover:bg-blue-500 text-blue-950 dark:text-white font-bold text-sm md:text-base rounded-lg transition-all duration-200 shadow-xl hover:shadow-2xl min-w-[200px]"
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
                    className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 md:px-10 md:py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm md:text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl min-w-[200px]"
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
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Scope & Coverage</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
            INFRA Watch aggregates and maps out agricultural and fisheries infrastructure projects under AMEFIP to ensure transparent resource allocation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card 1 */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between rounded-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-8 pb-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-lg mb-4 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide">
                AMEFSS
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                Agricultural Machinery, Equipment and Facilities Support Services
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Provision of post-harvest facilities, grain dryers, storage warehouses, tractors, and sorting/processing equipment directly to farmer cooperatives to secure food supply chains.
              </p>
            </CardContent>
            <CardFooter className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Link 
                href="/projects?program=amss" 
                className={cn(buttonVariants({ variant: "default" }), "w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-lg flex items-center justify-center")}
              >
                View AMEFSS Projects
              </Link>
            </CardFooter>
          </Card>

          {/* Card 2 */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between rounded-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-8 pb-4">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg mb-4 text-primary font-bold text-sm tracking-wide">
                INS
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                Irrigation Network Services
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Rehabilitation and construction of diversion dams, concrete distribution canals, solar powered water pumps, and local irrigation systems supporting farmer fields.
              </p>
            </CardContent>
            <CardFooter className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Link 
                href="/projects?program=ins" 
                className={cn(buttonVariants({ variant: "default" }), "w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-10 rounded-lg flex items-center justify-center")}
              >
                View INS Projects
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Before/After Visual Slider */}
      <section className="bg-white dark:bg-slate-900 py-20 px-4 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Before & After Project Showcase</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
              Drag the divider line to preview the transformation of active infrastructure sites, comparing dry soils with operational concrete irrigation channels.
            </p>
          </div>

          <div className="relative w-full h-[400px] md:h-[480px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg select-none">
            {/* Before Stage */}
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-850 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-md">
                <span className="inline-block px-3 py-1 rounded bg-slate-900/10 dark:bg-slate-100/10 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-3">Pre-Construction Site</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-150 mb-2">Impassable & Dry Canals</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Inoperative systems and dry soil fields prior to government intervention and construction.
                </p>
              </div>
            </div>

            {/* After Stage (Teal theme overlay) */}
            <div 
              className="absolute inset-0 bg-primary/90 flex flex-col items-center justify-center text-center p-8 transition-all"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            >
              <div className="max-w-md text-primary-foreground">
                <span className="inline-block px-3 py-1 rounded bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">Completed INS Project</span>
                <h3 className="text-2xl font-bold text-white mb-2">Modern Concrete Infrastructure</h3>
                <p className="text-primary-foreground/80 text-sm leading-relaxed">
                  Operational concrete canal networks flowing with water to irrigate adjacent farmland.
                </p>
              </div>
            </div>

            {/* Slider Control Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white select-none hover:bg-slate-800 transition-colors">↔</div>
            </div>

            {/* Hidden range input overlay for dragging */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sliderPosition} 
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">How It Works</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
            INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <Card key={step.num} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl relative hover:shadow-md transition-all">
              <span className="absolute top-6 right-6 font-mono text-3xl font-bold text-slate-200 dark:text-slate-800">{step.num}</span>
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 mt-4">{step.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Shield, Users, HelpCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t } = useTranslation();
  const [sliderPosition, setSliderPosition] = useState(50);

  // Static Mock Data for INFRA Watch (AMEFIP & INS)
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
      desc: "Browse AMEFIP & INS infrastructure projects. Filter by sub-program, budget, region, and status.",
    },
    {
      num: "02",
      title: "Inspect Site Details",
      desc: "Review coordinates, physical vs. financial progress, and the official program of works checklist.",
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
      <section className="relative overflow-hidden bg-slate-900 text-white py-20 px-4 md:py-32 border-b border-slate-800">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        
        <div className="relative max-w-5xl mx-auto text-center z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Infrastructure Network for <br />
            <span className="text-accent">
              Fair Reporting & Accountability
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-3xl mx-auto mb-10 leading-relaxed">
            Empowering citizens to monitor, evaluate, and provide feedback on AMEFIP Agricultural Machinery and Irrigation Network Services (INS) projects across municipalities from 2021 to 2026.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-16">
            <Link 
              href="/projects" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center text-sm transition-all"
            >
              Explore Projects <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link 
              href="/report-issue" 
              className="border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 h-12 px-6 rounded-lg flex items-center justify-center font-bold text-sm transition-all"
            >
              Report an Issue
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mt-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700/60 text-center rounded-xl p-5 shadow-md">
                  <p className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-1">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-extrabold text-white mb-1 font-mono">{stat.value}</p>
                  <p className="text-[10px] text-slate-400">{stat.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Coverage Section */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Scope & Coverage</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
            INFRA Watch aggregates and maps out key sub-programs under the BAFE AMEFIP framework to ensure transparent resource allocation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card 1 */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between rounded-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-8 pb-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-lg mb-4 text-slate-800 dark:text-slate-100 font-extrabold text-sm tracking-wide">
                AMSS
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
                View AMSS Projects
              </Link>
            </CardFooter>
          </Card>

          {/* Card 2 */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between rounded-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-8 pb-4">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg mb-4 text-primary font-extrabold text-sm tracking-wide">
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
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Before & After Project Showcase</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
              Drag the divider line to preview the transformation of active infrastructure sites, comparing dry soils with operational concrete irrigation channels.
            </p>
          </div>

          <div className="relative w-full h-[400px] md:h-[480px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg select-none">
            {/* Before Stage */}
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-850 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-md">
                <span className="inline-block px-3 py-1 rounded bg-slate-900/10 dark:bg-slate-100/10 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-3">Pre-Construction Site</span>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-150 mb-2">Impassable & Dry Canals</h3>
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
                <h3 className="text-2xl font-extrabold text-white mb-2">Modern Concrete Infrastructure</h3>
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
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white select-none hover:bg-slate-800 transition-colors">
                ◄►
              </div>
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
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">How It Works</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
            INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <Card key={step.num} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl relative hover:shadow-md transition-all">
              <span className="absolute top-6 right-6 font-mono text-3xl font-extrabold text-slate-200 dark:text-slate-800">{step.num}</span>
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2 mt-4">{step.title}</h3>
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

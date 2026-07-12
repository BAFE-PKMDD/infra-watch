"use client";

import { ArrowRight, BookOpen, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function AdministrativeOrderBook() {
  const pdfUrl = "/Administrative-Order-No.-4-Series-of-2026.pdf";

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-10 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 shadow-sm relative overflow-hidden group">

      {/* Background Image */}
      <div className="absolute inset-0 left-1/2 opacity-25 dark:opacity-10 pointer-events-none">
        <Image
          src="/ao4-bg.jpg"
          alt="FMR Project Groundbreaking"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent dark:from-[#0d1526] dark:via-[#0d1526]/80 dark:to-transparent" />
      </div>

      {/* 3D Document Container */}
      <div className="relative flex-shrink-0 perspective-1000 group-hover:scale-105 transition-transform duration-500 ease-out">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative w-[180px] h-[260px] md:w-[220px] md:h-[320px] transform-style-3d rotate-y-[-25deg] rotate-x-[10deg] group-hover:rotate-y-[-15deg] group-hover:rotate-x-[5deg] transition-all duration-500 ease-out shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Cover */}
          <div className="absolute inset-0 rounded-r-md rounded-l-sm shadow-inner transform-style-3d backface-hidden z-20 border-l border-white/10 overflow-hidden bg-white dark:bg-slate-800">
            {/* Spine Highlight */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-amber-600/30 to-transparent z-10" />

            {/* Document Cover Design */}
            <div className="absolute inset-0 flex flex-col items-center justify-between p-4 md:p-5">
              {/* Header stripe */}
              <div className="w-full">
                <div className="w-full h-1.5 bg-amber-600 rounded-full mb-2" />
                <div className="w-3/4 h-0.5 bg-amber-400/60 rounded-full mb-4" />
              </div>

              {/* DA Seal */}
              <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                <Image
                  src="/bafe-logo.png"
                  alt="BAFE Seal"
                  fill
                  sizes="80px"
                  className="object-contain opacity-80"
                />
              </div>

              {/* Title Text */}
              <div className="text-center space-y-1.5 flex-1 flex flex-col justify-center">
                <p className="text-[8px] md:text-[9px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-[0.15em]">
                  Administrative Order
                </p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  No. 4
                </p>
                <p className="text-[7px] md:text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Series of 2026
                </p>
                <div className="w-10 h-px bg-slate-300 dark:bg-slate-600 mx-auto" />
                <p className="text-[6px] md:text-[7px] text-slate-600 dark:text-slate-300 leading-snug px-2 max-w-[150px]">
                  General Guidelines on the Implementation of FMR Projects
                </p>
              </div>

              {/* Footer stripe */}
              <div className="w-full">
                <div className="w-full h-1 bg-blue-800 rounded-full" />
              </div>
            </div>
          </div>

          {/* Pages (Thickness) */}
          <div className="absolute right-0 top-[2px] bottom-[2px] w-[30px] bg-white transform rotate-y-90 translate-x-[15px] translate-z-[-1px] shadow-sm bg-[repeating-linear-gradient(90deg,#f9f9f9,#f9f9f9_1px,#eee_2px)]" />

          {/* Back Cover */}
          <div className="absolute inset-0 bg-blue-900 rounded-l-sm translate-z-[-30px] shadow-xl" />
        </a>

        {/* Shadow underneath */}
        <div className="absolute -bottom-8 left-4 right-4 h-4 bg-black/40 blur-xl rotate-y-[-25deg] group-hover:rotate-y-[-15deg] transition-all duration-500" />
      </div>

      {/* Text Content */}
      <div className="flex-1 text-center md:text-left relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          FMR Implementation Guidelines
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
          Administrative Order No. 4, Series of 2026
        </p>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-[360px]">
          The official <strong>General Guidelines on the Implementation of the Department of Agriculture&apos;s Farm-to-Market Road Projects</strong> for FY 2026 and onwards. This document outlines procedures, requirements, and standards for all FMR project stakeholders.
        </p>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <Button
            asChild
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-900/20 transition-all transform active:scale-95"
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4" />
              <span>Read Guidelines</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
          </Button>

          <Button variant="outline" asChild className="hidden md:flex border-slate-200 dark:border-slate-800">
            <a href={pdfUrl} download="AO-No-4-Series-2026-FMR-Guidelines.pdf">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

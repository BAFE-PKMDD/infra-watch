"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, BookOpen, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function BluecopyBook() {
  const pdfUrl = "/FMRNP-BLUECOPY.pdf";

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-10 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 shadow-sm relative overflow-hidden group">

      {/* Silhouette Background Image */}
      <div className="absolute inset-0 left-1/2 opacity-25 dark:opacity-10 pointer-events-none">
        <Image
          src="/fmrdp-bg.jpeg"
          alt="FMR Background"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent dark:from-[#0d1526] dark:via-[#0d1526]/80 dark:to-transparent" />
      </div>

      {/* Decorative Background Fade */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-blue-50/20 to-transparent dark:from-[#13233c]/10 dark:to-transparent pointer-events-none" />

      {/* 3D Book Container */}
      <div className="relative flex-shrink-0 perspective-1000 group-hover:scale-105 transition-transform duration-500 ease-out">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative w-[180px] h-[260px] md:w-[220px] md:h-[320px] transform-style-3d rotate-y-[-25deg] rotate-x-[10deg] group-hover:rotate-y-[-15deg] group-hover:rotate-x-[5deg] transition-all duration-500 ease-out shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Cover - Using Actual FMRNP Cover Image */}
          <div className="absolute inset-0 rounded-r-md rounded-l-sm shadow-inner transform-style-3d backface-hidden z-20 border-l border-white/10 overflow-hidden">
            {/* Book Spine Highlight (Left edge) */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-white/20 to-transparent z-10" />

            {/* Cover Image */}
            <Image
              src="/FMRNP-Cover.jpg"
              alt="FMRNP Bluecopy Cover"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Pages (Thickness) */}
          <div className="absolute right-0 top-[2px] bottom-[2px] w-[30px] bg-white transform rotate-y-90 translate-x-[15px] translate-z-[-1px] shadow-sm bg-[repeating-linear-gradient(90deg,#f9f9f9,#f9f9f9_1px,#eee_2px)]" />

          {/* Back Cover */}
          <div className="absolute inset-0 bg-[#002855] rounded-l-sm translate-z-[-30px] shadow-xl" />

        </a>
        {/* Shadow underneath */}
        <div className="absolute -bottom-8 left-4 right-4 h-4 bg-black/40 blur-xl rotate-y-[-25deg] group-hover:rotate-y-[-15deg] transition-all duration-500" />
      </div>

      {/* Text Content */}
      <div className="flex-1 text-center md:text-left relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
          National FMR Plan
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-[310px]">
          Access the official <strong>Farm-to-Market Road Network Plan Bluecopy</strong>. This comprehensive document outlines the strategic framework, standards, and targets for rural infrastructure development across the Philippines.
        </p>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <Button
            asChild
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-900/20 transition-all transform active:scale-95"
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4" />
              <span>Open</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
          </Button>

          <Button variant="outline" asChild className="hidden md:flex border-slate-200 dark:border-slate-800">
            <a href={pdfUrl} download="FMRNP-National-Plan.pdf">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, BookOpen, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LguGuidebook() {
  const pdfUrl = "/LGU-Guidebook-v2.0-FINALb.pdf";

  return (
    <div className="w-full flex flex-col md:flex-row items-center gap-8 md:gap-12 p-6 md:p-8 rounded-xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 relative overflow-hidden group">
      {/* Silhouette Background Image */}
      <div className="absolute inset-0 left-1/2 opacity-20 dark:opacity-10 pointer-events-none">
        <Image
          src="/irrigation.png"
          alt="Agricultural Infrastructure Background"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/15 to-transparent dark:from-[#0d1526] dark:via-[#0d1526]/85 dark:to-transparent" />
      </div>

      {/* Decorative Accent Glow */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-blue-50/20 to-transparent dark:from-[#13233c]/10 dark:to-transparent pointer-events-none" />

      {/* 3D Book Container */}
      <div className="relative flex-shrink-0 perspective-1000 group-hover:scale-105 transition-transform duration-500 ease-out">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open LGU GUIDEBOOK in a new tab"
          className="block relative w-[180px] h-[260px] md:w-[220px] md:h-[320px] transform-style-3d rotate-y-[-25deg] rotate-x-[10deg] group-hover:rotate-y-[-15deg] group-hover:rotate-x-[5deg] transition-all duration-500 ease-out shadow-2xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-r-md rounded-l-sm"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front Cover - Using Extracted LGU Guidebook Cover Image */}
          <div className="absolute inset-0 rounded-r-md rounded-l-sm shadow-inner transform-style-3d backface-hidden z-20 border-l border-white/10 overflow-hidden bg-slate-900">
            {/* Spine Highlight (Left edge) */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-blue-400/30 to-transparent z-10" />

            {/* Cover Image */}
            <Image
              src="/lgu-guidebook-cover.jpg"
              alt="LGU Guidebook Cover"
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

        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          LGU GUIDEBOOK
        </h2>

        <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
          The official reference manual for Local Government Units (LGUs) issued by the Department of Agriculture through BAFE. This guidebook assists provinces, cities, and municipalities in operationalizing Agricultural and Biosystems Engineering (ABE) offices, managing devolved agricultural and biosystems infrastructure functions, and adhering to national standards in compliance with Republic Act No. 10601.
        </p>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <Button
            asChild
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all transform active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4" />
              <span>Open Guidebook</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
          </Button>

          <Button
            variant="outline"
            asChild
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg transition-colors dark:border-[#1e3a5f]/40 dark:text-slate-200 dark:hover:bg-[#13233c]/50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <a href={pdfUrl} download="LGU-Guidebook-v2.0.pdf">
              <Download className="w-4 h-4 mr-1" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

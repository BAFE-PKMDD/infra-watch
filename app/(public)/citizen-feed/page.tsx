import type { Metadata } from "next";
import Image from "next/image";
import { FeedbackFeedClient } from "@/components/feedback-feed/feedback-feed-client";
import { FeedLeftSidebar } from "@/components/feedback-feed/feed-left-sidebar";
import { FeedRightSidebar } from "@/components/feedback-feed/feed-right-sidebar";
import { getBlurDataURL } from "@/lib/image-utils";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Citizen Feed | Infra Watch",
  description:
    "Browse citizen feedback, issue reports, and community discussions about infrastructure projects across the Philippines.",
  keywords: [
    "infrastructure feedback",
    "citizen feedback",
    "infrastructure issues",
    "citizen feed",
    "Philippines",
    "Infra Watch",
    "project reviews",
  ],
  openGraph: {
    title: "Citizen Feed | Infra Watch",
    description:
      "Browse citizen feedback and issue reports from infrastructure projects across the Philippines.",
    type: "website",
    url: `${baseUrl}/citizen-feed`,
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Infra Watch Citizen Feed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Citizen Feed | Infra Watch",
    description:
      "Browse citizen feedback and issue reports from infrastructure projects across the Philippines.",
    images: [`${baseUrl}/og-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/citizen-feed`,
  },
};

export default function CitizenFeedPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-[#0d1526]/30 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative h-[280px] overflow-hidden bg-blue-950 dark:bg-[#0d1526]">
        <div className="absolute inset-0">
          <Image
            src="/irrigation.png"
            alt="Citizen Feed"
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
          <p className="text-amber-300 text-xs font-semibold tracking-[0.3em] uppercase mb-2">
            Community Voices
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Citizen Feed
          </h1>
          <p className="text-slate-100 max-w-3xl text-sm md:text-base leading-relaxed opacity-90">
            Feedback, issue reports, and project insights from citizens on the ground
          </p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <main id="main-content" className="relative -mt-6 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <FeedLeftSidebar />

            {/* Center Feed */}
            <div className="flex-1 min-w-0">
              <FeedbackFeedClient />
            </div>

            {/* Right Sidebar */}
            <FeedRightSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}

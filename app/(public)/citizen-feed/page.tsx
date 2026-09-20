import type { Metadata } from "next";
import { FeedbackFeedClient } from "@/components/feedback-feed/feedback-feed-client";
import { FeedLeftSidebar } from "@/components/feedback-feed/feed-left-sidebar";
import { FeedRightSidebar } from "@/components/feedback-feed/feed-right-sidebar";

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
      <div className="relative overflow-hidden bg-slate-900 dark:bg-[#0d1526] py-8 sm:py-10 border-b border-slate-200 dark:border-slate-800">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Citizen Feed
          </h1>
          <p className="text-slate-300 max-w-3xl text-sm sm:text-base leading-relaxed">
            Community feedback, on-the-ground observations, and reported issues across monitored infrastructure projects.
          </p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <main id="main-content" className="relative pt-6 pb-16">
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

import React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { AiAssistantWidget } from "@/components/ai-assistant-widget";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PublicBanner } from "@/components/site-notices/public-banner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Above the sticky header, so it scrolls away with the page and the header stays put. */}
      <PublicBanner />
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
      <AiAssistantWidget />
      <AnnouncementDialog />
      {/* Public pages only: sign-in, citizen, and admin pages are never reported. */}
      <GoogleAnalytics />
    </div>
  );
}

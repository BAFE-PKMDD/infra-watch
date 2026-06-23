"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ProjectHero } from "@/components/projects/project-hero";
import { ProjectHighlights } from "@/components/projects/project-highlights";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { ProjectTabPanels } from "@/components/projects/project-tab-panels";
import type { ProjectDetail, ProjectTabKey } from "@/types";

interface ProjectDetailClientProps {
  project: ProjectDetail;
}

const validTabs: ProjectTabKey[] = [
  "overview",
  "articles",
  "photos",
  "videos",
  "documents",
  "pow",
  "procurement",
  "feedback",
];

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Always initialize with 'overview' to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState<ProjectTabKey>("overview");

  // Read tab from URL after mount to avoid hydration issues
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ProjectTabKey | null;
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: ProjectTabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Navigate to photos tab
  const handleShowOnMap = () => {
    setActiveTab("photos");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "photos");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Calculate counts for sidebar
  const metadata = project.metadata || {};
  const tabCounts: Partial<Record<ProjectTabKey, number>> = {
    photos: metadata.geotags?.length || 0,
    pow: metadata.powRelation?.length || 0,
    procurement: metadata.procurementRelation?.length || 0,
    feedback: project.feedbackCount || 0,
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-12">
      <ProjectHero project={project} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <ProjectHighlights project={project} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ProjectSidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              tabCounts={tabCounts}
            />
          </div>
          <div className="lg:col-span-3">
            <ProjectTabPanels activeTab={activeTab} project={project} onShowOnMap={handleShowOnMap} />
          </div>
        </div>
      </div>
    </div>
  );
}

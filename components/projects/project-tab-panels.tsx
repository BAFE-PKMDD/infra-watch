"use client";

import React, { useState, useEffect } from "react";
import { Video, Image as ImageIcon, FileText, ClipboardList, Milestone, MessageSquare, AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { ProjectEmptyState } from "@/components/projects/project-empty-state";
import { ProjectOverview } from "@/components/projects/detail/project-overview";
import { ProjectPow } from "@/components/projects/detail/project-pow";
import { ProjectFeedback } from "@/components/projects/detail/project-feedback";
import type { ProjectDetail, ProjectTabKey } from "@/types";

interface ProjectTabPanelsProps {
  activeTab: ProjectTabKey;
  project: ProjectDetail;
  onShowOnMap?: () => void;
}

export function ProjectTabPanels({ activeTab, project, onShowOnMap }: ProjectTabPanelsProps) {
  const searchParams = useSearchParams();

  const highlightFeedbackId = searchParams.get("feedbackId") || undefined;
  const highlightCommentId = searchParams.get("commentId") || undefined;

  // Extract relations from project metadata or fallback to empty arrays
  const powRelations = project.metadata?.powRelation || [];
  const procurementRelations = project.metadata?.procurementRelation || [];
  const geotags = project.metadata?.geotags || [];

  // Track visited tabs for lazy mounting
  const [visitedTabs, setVisitedTabs] = useState<Set<ProjectTabKey>>(new Set(["overview"]));

  useEffect(() => {
    setVisitedTabs((prev) => new Set(prev).add(activeTab));
  }, [activeTab]);

  return (
    <div className="relative">
      {/* Overview Tab */}
      <div className={activeTab === "overview" ? "block" : "hidden"}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: activeTab === "overview" ? 1 : 0, y: activeTab === "overview" ? 0 : 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <ProjectOverview project={project} onShowOnMap={onShowOnMap} />
        </motion.div>
      </div>

      {/* Program of Works (POW) Timeline Progress */}
      {visitedTabs.has("pow") && (
        <div className={activeTab === "pow" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "pow" ? 1 : 0, y: activeTab === "pow" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectPow powRelations={powRelations} />
          </motion.div>
        </div>
      )}

      {/* Citizen Feedback Feed */}
      {visitedTabs.has("feedback") && (
        <div className={activeTab === "feedback" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "feedback" ? 1 : 0, y: activeTab === "feedback" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectFeedback
              projectId={project.id}
              highlightFeedbackId={highlightFeedbackId}
              highlightCommentId={highlightCommentId}
            />
          </motion.div>
        </div>
      )}

      {/* Procurement Tab */}
      {visitedTabs.has("procurement") && (
        <div className={activeTab === "procurement" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "procurement" ? 1 : 0, y: activeTab === "procurement" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {procurementRelations.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-lg">
                  <h2 className="text-lg font-semibold">Procurement Milestones ({procurementRelations.length})</h2>
                </div>
                <div className="p-6">
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 pt-2">
                    {procurementRelations.map((m: any, idx: number) => (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary z-10" />
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="flex items-start gap-2.5">
                              <Milestone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{m.milestone}</h4>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              {m.target_date && (
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Target: <span className="text-slate-700 dark:text-slate-350">{new Date(m.target_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {m.actual_date && (
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Actual: <span className="text-primary">{new Date(m.actual_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {m.remarks && <p className="text-xs text-slate-650 dark:text-slate-400 mt-2">{m.remarks}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ProjectEmptyState
                icon={ClipboardList}
                title="Procurement Milestones"
                description="No procurement logs recorded for this contract."
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Photos Tab */}
      {visitedTabs.has("photos") && (
        <div className={activeTab === "photos" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "photos" ? 1 : 0, y: activeTab === "photos" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {geotags.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-lg">
                  <h2 className="text-lg font-semibold">Site Geotagged Photos ({geotags.length})</h2>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {geotags.map((tag: any, idx: number) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850">
                      <img src={tag.url} alt={`Geotag ${idx + 1}`} className="object-cover w-full h-full" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-[9px] text-white">
                        {tag.location || `Latitude: ${tag.latitude || project.coordinates?.split(",")[0]}, Longitude: ${tag.longitude || project.coordinates?.split(",")[1]}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ProjectEmptyState
                icon={ImageIcon}
                title="Geotagged Photo Gallery"
                description="No geotagged construction site photos have been uploaded for verification yet."
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Videos Tab */}
      {visitedTabs.has("videos") && (
        <div className={activeTab === "videos" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "videos" ? 1 : 0, y: activeTab === "videos" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectEmptyState
              icon={Video}
              title="Drone Logs & Videos"
              description="No official drone flyby logs or verified video footage links recorded for this project."
            />
          </motion.div>
        </div>
      )}

      {/* Articles Tab */}
      {visitedTabs.has("articles") && (
        <div className={activeTab === "articles" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "articles" ? 1 : 0, y: activeTab === "articles" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectEmptyState
              icon={FileText}
              title="Press Releases & News Updates"
              description="No government press releases or media coverages have linked to this project code yet."
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

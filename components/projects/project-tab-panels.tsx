import React from "react";
import { Video } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";

import { ProjectEmptyState } from "@/components/projects/project-empty-state";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectUpdates } from "@/components/projects/project-updates";
import { ProjectPhotos } from "@/components/projects/project-photos";
import { ProjectDocuments } from "@/components/projects/project-documents";
import { ProjectPow } from "@/components/projects/project-pow";
import { ProjectProcurement } from "@/components/projects/project-procurement";
import { ProjectArticles } from "@/components/projects/project-articles";
import { ProjectFeedback } from "@/components/projects/project-feedback";
import type { ProjectDetail, ProjectTabKey } from "@/types";
import { GeoTag } from "@/types/photo.types";
import { ProposalDocument, PowRelation, ProcurementRelation } from "@/types/project.types";
import { useTranslation } from "@/i18n";

interface ProjectMetadata {
  geotag?: GeoTag[];
  proposalDocuments?: ProposalDocument[];
  powRelation?: PowRelation[];
  procurementRelation?: ProcurementRelation[];
  kmllink?: string | { url: string };
  coordinates?: string;
}

interface ProjectTabPanelsProps {
  activeTab: ProjectTabKey;
  project: ProjectDetail & {
    metadata?: ProjectMetadata | null;
  };
  onShowOnMap?: () => void;
}

export function ProjectTabPanels({ activeTab, project, onShowOnMap }: ProjectTabPanelsProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const highlightFeedbackId = searchParams.get("feedbackId") || undefined;
  const highlightCommentId = searchParams.get("commentId") || undefined;
  // Extract metadata
  const metadata = project.metadata as ProjectMetadata | null | undefined;
  const geotags = metadata?.geotag || [];
  const documents = metadata?.proposalDocuments || [];
  const powRelations = metadata?.powRelation || [];
  const procurementRelations = metadata?.procurementRelation || [];
  const articles = project.articles || [];
  const projectCoordinates = project.coordinates || (typeof metadata?.coordinates === "string" ? metadata.coordinates : undefined);

  // Track which tabs have been visited (to enable lazy mounting)
  const [visitedTabs, setVisitedTabs] = React.useState<Set<ProjectTabKey>>(new Set(["overview"]));

  // Mark tab as visited when it becomes active
  React.useEffect(() => {
    setVisitedTabs((prev) => new Set(prev).add(activeTab));
  }, [activeTab]);

  return (
    <div className="relative">
      {/* Overview Tab - Always mounted */}
      <div className={activeTab === "overview" ? "block" : "hidden"}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: activeTab === "overview" ? 1 : 0, y: activeTab === "overview" ? 0 : 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <ProjectOverview project={project} onShowOnMap={onShowOnMap} />
        </motion.div>
      </div>

      {/* Feedback Tab - Lazy mounted */}
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

      {/* Photos Tab - Only render when active (fixes Leaflet initialization issue) */}
      {visitedTabs.has("photos") && activeTab === "photos" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <ProjectPhotos
            projectId={project.id}
            geotags={geotags}
            projectCoordinates={projectCoordinates}
            kmlLink={typeof metadata?.kmllink === 'string' ? metadata.kmllink : metadata?.kmllink?.url}
          />
        </motion.div>
      )}

      {/* Videos Tab - Lazy mounted */}
      {visitedTabs.has("videos") && (
        <div className={activeTab === "videos" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "videos" ? 1 : 0, y: activeTab === "videos" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectEmptyState
              icon={Video}
              title={t("projectDetail.tabs.videos.title")}
              description={t("projectDetail.tabs.videos.empty")}
            />
          </motion.div>
        </div>
      )}

      {/* Articles Tab - Lazy mounted */}
      {visitedTabs.has("articles") && (
        <div className={activeTab === "articles" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "articles" ? 1 : 0, y: activeTab === "articles" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectArticles articles={articles} />
          </motion.div>
        </div>
      )}

      {/* Documents Tab - Lazy mounted */}
      {visitedTabs.has("documents") && (
        <div className={activeTab === "documents" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "documents" ? 1 : 0, y: activeTab === "documents" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectDocuments documents={documents} />
          </motion.div>
        </div>
      )}

      {/* POW Tab - Lazy mounted */}
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

      {/* Procurement Tab - Lazy mounted */}
      {visitedTabs.has("procurement") && (
        <div className={activeTab === "procurement" ? "block" : "hidden"}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: activeTab === "procurement" ? 1 : 0, y: activeTab === "procurement" ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProjectProcurement
              procurementRelations={procurementRelations}
              isActive={activeTab === "procurement"}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

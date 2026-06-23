"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  HelpCircle,
  ClipboardList,
  Wallet,
  CalendarRange,
  Ruler,
  FolderOpen,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectDetail } from "@/types";
import { useTranslation } from "@/i18n";

interface ProjectOverviewProps {
  project: ProjectDetail & {
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
    district?: string;
    psgcCode?: string;
    latitude?: number;
    longitude?: number;
    abc?: number;
    calendarDays?: number;
    budgetProcess?: string;
    procurementMode?: string;
    operatingUnit?: string;
    implementationType?: string;
    bannerProgram?: string;
    subProgram?: string;
    prexcProgram?: string;
    yearFunded?: string | number;
    projectType?: string;
    roadClass?: string;
    roadType?: string;
    roadUsed?: string;
    proposedLength?: string;
    quantity?: string;
    quantityUnit?: string;
    beneficiary?: string;
    recipientType?: string;
    indicatorLevel1?: string;
    indicatorLevel3?: string;
    dateTurnOver?: Date | string;
    actualCompletionDate?: Date | string;
    lastSyncedAt?: Date | string;
    commodities?: string[] | null;
    agencyData?: Record<string, string | number | boolean | null> | null;
  };
  onShowOnMap?: () => void;
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ icon, title, children, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <span className="text-primary dark:text-primary">{icon}</span>
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface DataFieldProps {
  label: string;
  tooltip: string;
  value: React.ReactNode;
  isMono?: boolean;
}

function DataField({ label, tooltip, value, isMono = false }: DataFieldProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <span title={tooltip} className="cursor-help inline-flex">
          <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0" />
        </span>
      </div>
      <p className={`text-sm font-medium text-slate-900 dark:text-white break-words ${isMono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function ProjectOverview({ project, onShowOnMap }: ProjectOverviewProps) {
  const { t, language } = useTranslation();

  const formatBudget = (amount: number) => {
    return `₱${amount.toLocaleString(language === 'tl' ? 'en-PH' : 'en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string) => {
    if (typeof date === "string") return date;
    return new Date(date).toLocaleDateString(language === "tl" ? "en-PH" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Primary Card Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-xl">
        <h2 className="text-lg font-semibold">
          {t("projectDetail.overview.title")}
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Project Identity */}
          <SectionCard
            icon={<ClipboardList className="w-4 h-4" />}
            title={t("projectDetail.overview.projectTitle")}
          >
            <DataField
              label={t("projectDetail.overview.projectTitle")}
              tooltip={t("projectDetail.overview.projectTitleTooltip")}
              value={project.name}
            />
            <DataField
              label={t("projectDetail.overview.projectCode")}
              tooltip={t("projectDetail.overview.projectCodeTooltip")}
              value={project.code}
              isMono
            />
            <DataField
              label={t("projectDetail.overview.implementingAgency")}
              tooltip={t("projectDetail.overview.implementingAgencyTooltip")}
              value={project.implementingAgency}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {t("projectDetail.overview.status")}
                </span>
                <span title={t("projectDetail.overview.statusTooltip")} className="cursor-help inline-flex">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0" />
                </span>
              </div>
              <StatusBadge status={project.stage || t("projectDetail.overview.notCompleted")} />
            </div>
          </SectionCard>

          {/* Location & Site */}
          <SectionCard
            icon={<MapPin className="w-4 h-4" />}
            title={t("projectDetail.overview.location")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {t("projectDetail.overview.location")}
                </span>
                <span title={t("projectDetail.overview.locationTooltip")} className="cursor-help inline-flex">
                  <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0" />
                </span>
              </div>
              <button
                onClick={onShowOnMap}
                className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors group cursor-pointer border-0 bg-transparent p-0 text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
                <span className="underline decoration-dotted underline-offset-4">{project.location}</span>
              </button>
            </div>
            <DataField
              label={t("projectDetail.overview.coordinates")}
              tooltip={t("projectDetail.overview.coordinatesTooltip")}
              value={project.coordinates || t("projectDetail.overview.notAvailable")}
            />
            <DataField
              label={t("projectDetail.overview.contractor")}
              tooltip={t("projectDetail.overview.contractorTooltip")}
              value={project.contractor}
            />
          </SectionCard>

          {/* Budget */}
          <SectionCard
            icon={<Wallet className="w-4 h-4" />}
            title={t("projectDetail.overview.budget")}
          >
            <DataField
              label={t("projectDetail.overview.budget")}
              tooltip={t("projectDetail.overview.budgetTooltip")}
              value={formatBudget(project.budget)}
              isMono
            />
            {project.abc && (
              <DataField
                label={t("projectDetail.overview.abc")}
                tooltip={t("projectDetail.overview.abcTooltip")}
                value={formatBudget(project.abc)}
                isMono
              />
            )}
          </SectionCard>

          {/* Timeline */}
          <SectionCard
            icon={<CalendarRange className="w-4 h-4" />}
            title={t("projectDetail.overview.startDate")}
          >
            <div className="grid grid-cols-2 gap-4">
              <DataField
                label={t("projectDetail.overview.startDate")}
                tooltip={t("projectDetail.overview.startDateTooltip")}
                value={project.startDate}
              />
              <DataField
                label={t("projectDetail.overview.targetCompletion")}
                tooltip={t("projectDetail.overview.targetCompletionTooltip")}
                value={project.completionDate}
              />
            </div>
            {project.actualCompletionDate && (
              <DataField
                label={t("projectDetail.overview.actualCompletion")}
                tooltip={t("projectDetail.overview.actualCompletionTooltip")}
                value={formatDate(project.actualCompletionDate)}
              />
            )}
            {project.dateTurnOver && (
              <DataField
                label={t("projectDetail.overview.turnOverDate")}
                tooltip={t("projectDetail.overview.turnOverDateTooltip")}
                value={formatDate(project.dateTurnOver)}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <DataField
                label={t("projectDetail.overview.duration")}
                tooltip={t("projectDetail.overview.durationTooltip")}
                value={project.duration}
              />
              {project.calendarDays && (
                <DataField
                  label={t("projectDetail.overview.contractDuration")}
                  tooltip={t("projectDetail.overview.contractDurationTooltip")}
                  value={t("projectDetail.overview.calendarDays").replace("{days}", String(project.calendarDays))}
                />
              )}
            </div>
          </SectionCard>

          {/* Specifications */}
          <SectionCard
            icon={<Ruler className="w-4 h-4" />}
            title={t("projectDetail.overview.targetLength")}
          >
            <div className="grid grid-cols-2 gap-4">
              <DataField
                label={t("projectDetail.overview.targetLength")}
                tooltip={t("projectDetail.overview.targetLengthTooltip")}
                value={project.projectLength}
              />
              {project.postGeotaggedLength && (
                <DataField
                  label={t("projectDetail.overview.postGeotaggedLength")}
                  tooltip={t("projectDetail.overview.postGeotaggedLengthTooltip")}
                  value={project.postGeotaggedLength}
                />
              )}
            </div>
            <DataField
              label={t("projectDetail.overview.scopeOfWork")}
              tooltip={t("projectDetail.overview.scopeOfWorkTooltip")}
              value={project.scope}
            />
            {(project.roadClass || project.roadType) && (
              <div className="grid grid-cols-2 gap-4">
                {project.roadClass && (
                  <DataField
                    label={t("projectDetail.overview.roadClass")}
                    tooltip={t("projectDetail.overview.roadClassTooltip")}
                    value={project.roadClass}
                  />
                )}
                {project.roadType && (
                  <DataField
                    label={t("projectDetail.overview.roadType")}
                    tooltip={t("projectDetail.overview.roadTypeTooltip")}
                    value={project.roadType}
                  />
                )}
              </div>
            )}

            {/* Commodities */}
            {project.commodities && project.commodities.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {t("projectDetail.overview.commodities")}
                  </span>
                  <span title={t("projectDetail.overview.commoditiesTooltip")} className="cursor-help inline-flex">
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0" />
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {project.commodities.map((commodity, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground/90 dark:border-primary/30"
                    >
                      {commodity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Additional Details */}
          {(project.yearFunded || project.description || (project.agencyData && Object.keys(project.agencyData).length > 0)) && (
            <SectionCard
              icon={<FolderOpen className="w-4 h-4" />}
              title="Additional Details"
            >
              {project.yearFunded && (
                <DataField
                  label={t("projectDetail.overview.yearFunded")}
                  tooltip={t("projectDetail.overview.yearFundedTooltip")}
                  value={project.yearFunded}
                />
              )}

              {/* Agency-Specific Data */}
              {project.agencyData && Object.keys(project.agencyData).length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(project.agencyData).map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{key}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white break-words">
                        {value !== null && value !== undefined ? String(value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              {project.description && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("projectDetail.overview.description")}
                    </span>
                    <span title={t("projectDetail.overview.descriptionTooltip")} className="cursor-help inline-flex">
                      <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0" />
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{project.description}</p>
                </div>
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </motion.div>
  );
}

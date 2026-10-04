"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, CircleHelp, SkipForward, XCircle } from "lucide-react";

import { getProjectFarmOperations, getProjectProvinces, getProjectTypes } from "@/actions/query/get-location-options";
import { Button } from "@/components/ui/button";
import { ProjectResult, ProjectSearchInput, type SelectedProject } from "@/components/ui/project-search-input";
import { SmsRegionSelect } from "@/components/admin/issues/sms-region-select";
import { SMS_CATEGORY_OPTIONS, getSmsCategoryLabel } from "@/lib/sms-grievance/categories";
import { cn } from "@/lib/utils";
import type { SmsCategory, SmsNotBafeCategory } from "@/types/sms-grievance.types";

interface ProjectsApiRow {
  id: string;
  name: string;
  code?: string;
  sourceId?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  region?: string;
  farmOperation?: string;
  matchType?: "exact" | "nearby" | "type";
}

function mapProjectsApiRow(row: ProjectsApiRow): ProjectResult {
  return {
    id: row.id,
    name: row.name,
    sourceProjectId: row.code,
    sourceId: row.sourceId,
    province: row.province,
    municipality: row.municipality,
    barangay: row.barangay,
    region: row.region,
    farmOperation: row.farmOperation,
    matchType: row.matchType === "type" ? "exact" : row.matchType,
  };
}

export type IntakeDecision = "bafe_project" | "possible_bafe_project" | "not_bafe_project";

export type WizardStep = "decision" | "region" | "project" | "category" | "reason" | "review";

export function stepsForDecision(decision: IntakeDecision): WizardStep[] {
  if (decision === "bafe_project" || decision === "possible_bafe_project") {
    return ["decision", "region", "project", "category", "reason", "review"];
  }
  return ["decision", "reason", "review"];
}

const STEP_TITLES: Record<WizardStep, string> = {
  decision: "Is this about a BAFE project?",
  region: "Which region will own this case?",
  project: "Which project?",
  category: "What kind of concern?",
  reason: "Why does this match?",
  review: "Review and confirm",
};

export function SmsProjectTaggingWizard({
  intakeDecision,
  onIntakeDecisionChange,
  category,
  onCategoryChange,
  locationTag,
  onLocationTagChange,
  selectedProject,
  onSelectedProjectChange,
  decisionReason,
  onDecisionReasonChange,
  notBafeCategory,
  onNotBafeCategoryChange,
  assignedRegion,
  onAssignedRegionChange,
  intakeButtonLabel,
  onSaveIntakeDecision,
}: {
  intakeDecision: IntakeDecision;
  onIntakeDecisionChange: (value: IntakeDecision) => void;
  category: SmsCategory;
  onCategoryChange: (value: SmsCategory) => void;
  locationTag: string;
  onLocationTagChange: (value: string) => void;
  selectedProject: SelectedProject | null;
  onSelectedProjectChange: (value: SelectedProject | null) => void;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  notBafeCategory: SmsNotBafeCategory;
  onNotBafeCategoryChange: (value: SmsNotBafeCategory) => void;
  assignedRegion: string;
  onAssignedRegionChange: (value: string) => void;
  intakeButtonLabel: string;
  onSaveIntakeDecision: () => void;
}) {
  const steps = stepsForDecision(intakeDecision);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const [projectTypeFilter, setProjectTypeFilter] = useState("all");
  const [farmOperationFilter, setFarmOperationFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");

  const { data: projectTypeOptions = [] } = useQuery({
    queryKey: ["sms-review-project-types"],
    queryFn: () => getProjectTypes(),
    staleTime: Infinity,
  });
  const { data: farmOperationOptions = [] } = useQuery({
    queryKey: ["sms-review-farm-operations"],
    queryFn: () => getProjectFarmOperations(),
    staleTime: Infinity,
  });
  const { data: provinceOptions = [] } = useQuery({
    queryKey: ["sms-review-provinces"],
    queryFn: () => getProjectProvinces(),
    staleTime: Infinity,
  });

  // Lets a search be narrowed by project type, farm-operation category, and/or province
  // on top of the free-text query — most useful for a report with no obvious
  // project-name keyword to search by (e.g. distributed farm equipment such as a hand
  // tractor, which was never itself a built infrastructure project) where the plain text
  // search otherwise falls back to location-only "nearby" matches that aren't related.
  const searchBafeProjects = async (query: string): Promise<ProjectResult[]> => {
    const params = new URLSearchParams({ search: query, limit: "20" });
    if (projectTypeFilter !== "all") params.set("type", projectTypeFilter);
    if (farmOperationFilter !== "all") params.set("farmOperation", farmOperationFilter);
    if (provinceFilter !== "all") params.set("provinceExact", provinceFilter);
    const response = await fetch(`/api/projects?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to search projects");
    const result = (await response.json()) as { data?: ProjectsApiRow[] };
    return (result.data ?? []).map(mapProjectsApiRow);
  };

  function goNext() {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }
  function pickDecision(value: IntakeDecision) {
    onIntakeDecisionChange(value);
    setStepIndex(0);
    // Move to this decision's next step on the same tick the new step list applies.
    setTimeout(() => setStepIndex(1), 0);
  }

  const canAdvance = currentStep === "region"
    ? assignedRegion.trim().length > 0
    : currentStep === "project"
      // A "possible" tag can move on without a matched project record — see the "Not
      // sure — possibly a BAFE project" decision and prototype-state.ts's accept action.
      ? (Boolean(selectedProject) || intakeDecision === "possible_bafe_project")
      : currentStep === "reason"
        ? decisionReason.trim().length > 0
        : true;

  const isNcrRegion = assignedRegion.trim().toUpperCase().includes("NCR");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
        {steps.map((step, index) => (
          <span
            key={step}
            aria-hidden="true"
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index <= stepIndex ? "bg-primary" : "bg-slate-200 dark:bg-slate-800",
            )}
          />
        ))}
      </div>
      <h4 className="mb-4 text-base font-bold text-slate-950 dark:text-white">{STEP_TITLES[currentStep]}</h4>

      {currentStep === "decision" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <DecisionCard
            icon={<Building2 aria-hidden="true" className="size-4" />}
            label="This is about a BAFE project"
            active={intakeDecision === "bafe_project"}
            onClick={() => pickDecision("bafe_project")}
          />
          <DecisionCard
            icon={<CircleHelp aria-hidden="true" className="size-4" />}
            label="Not sure — possibly a BAFE project"
            active={intakeDecision === "possible_bafe_project"}
            onClick={() => pickDecision("possible_bafe_project")}
          />
          <DecisionCard
            icon={<XCircle aria-hidden="true" className="size-4" />}
            label="Not a BAFE project"
            active={intakeDecision === "not_bafe_project"}
            onClick={() => pickDecision("not_bafe_project")}
          />
        </div>
      )}

      {currentStep === "region" && (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            An NCR moderator or admin assigns the region that will own this case before it&apos;s linked to a project.
          </p>
          <label className="block text-sm font-semibold" htmlFor="wizard-region-step">
            Region
            <SmsRegionSelect id="wizard-region-step" value={assignedRegion} onChange={onAssignedRegionChange} />
          </label>
          {assignedRegion.trim() && (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {isNcrRegion
                ? "Because this is NCR, the NCR review team links the matching project directly."
                : `Because this is outside NCR, the regional admin for ${assignedRegion} links the matching project.`}
            </p>
          )}
        </div>
      )}

      {currentStep === "project" && (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Search actual BAFE projects and choose the matching source record. A typed project name alone is not accepted.
            {locationTag && " Pre-filled below with the location mentioned in the message — edit it or pick a different match."}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Project type
              <select
                value={projectTypeFilter}
                onChange={(event) => setProjectTypeFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All types</option>
                {projectTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Farm operation category
              <select
                value={farmOperationFilter}
                onChange={(event) => setFarmOperationFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All categories</option>
                {farmOperationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Province
              <select
                value={provinceFilter}
                onChange={(event) => setProvinceFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All provinces</option>
                {provinceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <ProjectSearchInput
            value={selectedProject}
            onSelect={(project) => {
              onSelectedProjectChange(project);
              goNext();
            }}
            onClear={() => onSelectedProjectChange(null)}
            placeholder="Search actual BAFE projects by name, code, or location"
            queryKeyPrefix={`sms-review-bafe-projects-${projectTypeFilter}-${farmOperationFilter}-${provinceFilter}`}
            initialQuery={locationTag}
            searchFn={searchBafeProjects}
          />

          {intakeDecision === "possible_bafe_project" && (
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="mb-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Some reports — like distributed farm equipment (e.g. a hand tractor) — were never a built infrastructure project in the first place, so no project record will ever match. Tag this for follow-up without one.
              </p>
              <Button type="button" variant="outline" className="min-h-11 w-full font-medium sm:w-auto" onClick={goNext}>
                <SkipForward aria-hidden="true" className="size-4" /> No matching project — tag for follow-up
              </Button>
            </div>
          )}
        </div>
      )}

      {currentStep === "category" && (
        <label className="block text-sm font-semibold">
          Concern category
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {SMS_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      )}

      {currentStep === "reason" && (
        <div className="space-y-4">
          {intakeDecision === "not_bafe_project" && (
            <div>
              <p className="mb-2 block text-sm font-semibold">Which best describes this?</p>
              <p className="mb-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                The SMS line receives every text sent to it, not just BAFE ones — this changes what the auto-reply tells the sender.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <DecisionCard
                  icon={<XCircle aria-hidden="true" className="size-4" />}
                  label="Not related to InfraWatch or BAFE at all"
                  active={notBafeCategory === "not_related_to_infrawatch"}
                  onClick={() => onNotBafeCategoryChange("not_related_to_infrawatch")}
                />
                <DecisionCard
                  icon={<Building2 aria-hidden="true" className="size-4" />}
                  label="A real project complaint, but a different agency's project"
                  active={notBafeCategory === "different_agency_project"}
                  onClick={() => onNotBafeCategoryChange("different_agency_project")}
                />
              </div>
            </div>
          )}
          <label className="block text-sm font-semibold">
            Reason
            <textarea
              value={decisionReason}
              onChange={(event) => onDecisionReasonChange(event.target.value)}
              placeholder="Record the moderator or admin decision"
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>
      )}

      {currentStep === "review" && (
        <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <ReviewItem label="Decision" value={
              intakeDecision === "bafe_project"
                ? "BAFE project"
                : intakeDecision === "possible_bafe_project"
                  ? "Possible BAFE project (needs confirmation)"
                  : "Not a BAFE project"
            } />
            {(intakeDecision === "bafe_project" || intakeDecision === "possible_bafe_project") && <ReviewItem label="Region" value={assignedRegion || "Not set"} />}
            {(intakeDecision === "bafe_project" || intakeDecision === "possible_bafe_project") && (
              <ReviewItem
                label="Project"
                value={selectedProject?.name ?? (intakeDecision === "possible_bafe_project" ? "No match — flagged for follow-up" : "Not selected")}
              />
            )}
            {(intakeDecision === "bafe_project" || intakeDecision === "possible_bafe_project") && <ReviewItem label="Category" value={getSmsCategoryLabel(category)} />}
            {intakeDecision === "not_bafe_project" && (
              <ReviewItem
                label="Why not BAFE"
                value={notBafeCategory === "different_agency_project" ? "Different agency's project" : "Not related to InfraWatch/BAFE"}
              />
            )}
            <ReviewItem label="Reason" value={decisionReason || "(none entered)"} />
          </dl>

          {(intakeDecision === "bafe_project" || intakeDecision === "possible_bafe_project") && (
            <details>
              <summary className="min-h-11 cursor-pointer py-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                More routing details (optional)
              </summary>
              <div className="mt-3">
                <label className="text-sm font-semibold">
                  Location tag
                  <input
                    value={locationTag}
                    onChange={(event) => onLocationTagChange(event.target.value)}
                    placeholder="Use only the location supported by the SMS or source"
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
              </div>
            </details>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11 px-4" onClick={goBack} disabled={stepIndex === 0}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back
        </Button>
        {currentStep === "review" ? (
          <Button
            type="button"
            className="min-h-11 flex-1 px-4"
            disabled={
              (intakeDecision === "bafe_project" && !selectedProject)
              || ((intakeDecision === "bafe_project" || intakeDecision === "possible_bafe_project") && !assignedRegion.trim())
            }
            onClick={onSaveIntakeDecision}
          >
            <CheckCircle2 aria-hidden="true" className="size-4" /> {intakeButtonLabel}
          </Button>
        ) : (
          currentStep !== "project" && currentStep !== "decision" && (
            <Button type="button" className="min-h-11 px-4" disabled={!canAdvance} onClick={goNext}>
              Next <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function DecisionCard({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-slate-200 text-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

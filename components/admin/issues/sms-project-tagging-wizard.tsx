"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Copy, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProjectSearchInput, type SelectedProject } from "@/components/ui/project-search-input";
import { SMS_CATEGORY_LABELS } from "@/lib/sms-grievance/prototype-state";
import { cn } from "@/lib/utils";
import type { SmsCategory } from "@/types/sms-grievance.types";

export type IntakeDecision = "bafe_project" | "not_bafe_project" | "duplicate";

export type WizardStep = "decision" | "project" | "duplicate_ref" | "category" | "reason" | "review";

export function stepsForDecision(decision: IntakeDecision): WizardStep[] {
  if (decision === "bafe_project") return ["decision", "project", "category", "reason", "review"];
  if (decision === "duplicate") return ["decision", "duplicate_ref", "reason", "review"];
  return ["decision", "reason", "review"];
}

const STEP_TITLES: Record<WizardStep, string> = {
  decision: "Is this about a BAFE project?",
  project: "Which project?",
  duplicate_ref: "Which existing case?",
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
  duplicateOf,
  onDuplicateOfChange,
  assignedUnit,
  onAssignedUnitChange,
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
  duplicateOf: string;
  onDuplicateOfChange: (value: string) => void;
  assignedUnit: string;
  onAssignedUnitChange: (value: string) => void;
  assignedRegion: string;
  onAssignedRegionChange: (value: string) => void;
  intakeButtonLabel: string;
  onSaveIntakeDecision: () => void;
}) {
  const steps = stepsForDecision(intakeDecision);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

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

  const canAdvance = currentStep === "project"
    ? Boolean(selectedProject)
    : currentStep === "duplicate_ref"
      ? duplicateOf.trim().length > 0
      : currentStep === "reason"
        ? decisionReason.trim().length > 0
        : true;

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
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Step {stepIndex + 1} of {steps.length}
      </p>
      <h4 className="mb-4 text-base font-bold text-slate-950 dark:text-white">{STEP_TITLES[currentStep]}</h4>

      {currentStep === "decision" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <DecisionCard
            icon={<Building2 aria-hidden="true" className="size-5" />}
            label="This is about a BAFE project"
            active={intakeDecision === "bafe_project"}
            onClick={() => pickDecision("bafe_project")}
          />
          <DecisionCard
            icon={<XCircle aria-hidden="true" className="size-5" />}
            label="Not a BAFE project"
            active={intakeDecision === "not_bafe_project"}
            onClick={() => pickDecision("not_bafe_project")}
          />
          <DecisionCard
            icon={<Copy aria-hidden="true" className="size-5" />}
            label="Link as possible copy"
            active={intakeDecision === "duplicate"}
            onClick={() => pickDecision("duplicate")}
          />
        </div>
      )}

      {currentStep === "project" && (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Search actual BAFE projects and choose the matching source record. A typed project name alone is not accepted.</p>
          <ProjectSearchInput
            value={selectedProject}
            onSelect={(project) => {
              onSelectedProjectChange(project);
              goNext();
            }}
            onClear={() => onSelectedProjectChange(null)}
            placeholder="Search actual BAFE projects by name, code, or location"
            queryKeyPrefix="sms-review-bafe-projects"
          />
        </div>
      )}

      {currentStep === "duplicate_ref" && (
        <label className="block text-sm font-semibold">
          Existing sample case reference
          <input
            value={duplicateOf}
            onChange={(event) => onDuplicateOfChange(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      )}

      {currentStep === "category" && (
        <label className="block text-sm font-semibold">
          Concern category
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value as SmsCategory)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {Object.entries(SMS_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      )}

      {currentStep === "reason" && (
        <label className="block text-sm font-semibold">
          {intakeDecision === "bafe_project" ? "Why this grievance matches this BAFE project" : "Reason for this decision"}
          <textarea
            value={decisionReason}
            onChange={(event) => onDecisionReasonChange(event.target.value)}
            placeholder="Record the moderator or admin decision"
            className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      )}

      {currentStep === "review" && (
        <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <ReviewItem label="Decision" value={
              intakeDecision === "bafe_project" ? "BAFE project" : intakeDecision === "duplicate" ? "Possible copy" : "Not a BAFE project"
            } />
            {intakeDecision === "bafe_project" && <ReviewItem label="Project" value={selectedProject?.name ?? "Not selected"} />}
            {intakeDecision === "bafe_project" && <ReviewItem label="Category" value={SMS_CATEGORY_LABELS[category]} />}
            {intakeDecision === "duplicate" && <ReviewItem label="Existing case" value={duplicateOf} />}
            <ReviewItem label="Reason" value={decisionReason || "(none entered)"} />
          </dl>

          {intakeDecision === "bafe_project" && (
            <details>
              <summary className="min-h-11 cursor-pointer py-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                More routing details (optional)
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Location tag
                  <input
                    value={locationTag}
                    onChange={(event) => onLocationTagChange(event.target.value)}
                    placeholder="Use only the location supported by the SMS or source"
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Responsible office or review team
                  <input value={assignedUnit} onChange={(event) => onAssignedUnitChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="text-sm font-semibold">
                  Region
                  <input value={assignedRegion} onChange={(event) => onAssignedRegionChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
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
          <Button type="button" className="min-h-11 flex-1 px-4" disabled={intakeDecision === "bafe_project" && !selectedProject} onClick={onSaveIntakeDecision}>
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
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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

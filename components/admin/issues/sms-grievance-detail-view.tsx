"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { SmsCaseLifecycleStepper } from "@/components/admin/issues/sms-case-lifecycle-stepper";
import { SmsCaseResponsePanel } from "@/components/admin/issues/sms-case-response-panel";
import { SmsConversationTimeline } from "@/components/admin/issues/sms-conversation-timeline";
import { SmsGrievanceHeader, SmsGrievanceSummary } from "@/components/admin/issues/sms-grievance-summary";
import { SmsProjectTaggingWizard } from "@/components/admin/issues/sms-project-tagging-wizard";
import type { IntakeDecision } from "@/components/admin/issues/sms-project-tagging-wizard";
import { SmsPrototypeBanner } from "@/components/admin/issues/sms-prototype-banner";
import type { SelectedProject } from "@/components/ui/project-search-input";
import { readSmsPrototypeRecords, writeSmsPrototypeRecords } from "@/lib/sms-grievance/mock-store";
import { applySmsPrototypeAction, type PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import type { SmsCaseStatus, SmsCategory, SmsMockScenario } from "@/types/sms-grievance.types";

function projectSelection(item: SmsMockScenario | undefined): SelectedProject | null {
  if (!item?.projectId || item.projectMatch !== "confirmed") return null;
  return {
    id: item.projectId,
    name: item.projectLabel,
    sourceId: item.projectId,
    sourceProjectId: item.projectCode,
    province: item.projectProvince,
    municipality: item.projectMunicipality,
  };
}

function closedLabelFor(record: SmsMockScenario) {
  if (record.relevance === "out_of_scope") return "Closed — marked as not a BAFE project. No case was created.";
  if (record.relevance === "duplicate") return `Closed — linked as a possible copy of ${record.duplicateOf ?? "an earlier message"}. No new case was created.`;
  return null;
}

export function SmsGrievanceDetailView({ id, initialRecords }: { id: string; initialRecords: SmsMockScenario[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [storageReady, setStorageReady] = useState(false);
  const selected = records.find((item) => item.id === id) ?? null;

  const [intakeDecision, setIntakeDecision] = useState<IntakeDecision>("bafe_project");
  const [category, setCategory] = useState<SmsCategory>(selected?.category ?? "other_infrastructure");
  const [locationTag, setLocationTag] = useState(selected?.locationLabel ?? "");
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(projectSelection(selected ?? undefined));
  const [decisionReason, setDecisionReason] = useState("");
  const [duplicateOf, setDuplicateOf] = useState(selected?.duplicateOf ?? "[SAMPLE EXISTING CASE]");
  const [assignedUnit, setAssignedUnit] = useState(selected?.assignedUnit ?? "[SAMPLE REVIEW TEAM]");
  const [assignedRegion, setAssignedRegion] = useState(selected?.assignedRegion ?? "[SAMPLE REGION]");
  const [followUpNote, setFollowUpNote] = useState("");
  const [restrictionAuthorized, setRestrictionAuthorized] = useState(false);
  const [responseBody, setResponseBody] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [feedback, setFeedback] = useState("No message was sent. Changes on this page affect sample data only.");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readSmsPrototypeRecords(window.localStorage, initialRecords);
      setRecords(stored);
      setStorageReady(true);
      const match = stored.find((item) => item.id === id);
      if (match) {
        setCategory(match.category ?? "other_infrastructure");
        setLocationTag(match.locationLabel);
        setSelectedProject(projectSelection(match));
        setDuplicateOf(match.duplicateOf ?? "[SAMPLE EXISTING CASE]");
        setAssignedUnit(match.assignedUnit ?? "[SAMPLE REVIEW TEAM]");
        setAssignedRegion(match.assignedRegion ?? "[SAMPLE REGION]");
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [id, initialRecords]);

  useEffect(() => {
    if (storageReady) writeSmsPrototypeRecords(window.localStorage, records);
  }, [records, storageReady]);

  const canMakeRelevanceDecision = selected?.status === "needs_relevance_review";
  const isClosedWithoutCase = selected ? closedLabelFor(selected) !== null : false;
  const lifecycleAction: { to: SmsCaseStatus; label: string } | null = selected?.status === "pending_review"
    ? { to: "under_review", label: "Start review" }
    : selected?.status === "under_review"
      ? { to: "resolved", label: "Mark as resolved" }
      : selected?.status === "resolved"
        ? { to: "closed", label: "Close sample case" }
        : selected?.status === "closed"
          ? { to: "under_review", label: "Reopen case" }
          : null;

  const currentStep: 1 | 2 | 3 | 4 | null = !selected || isClosedWithoutCase
    ? null
    : canMakeRelevanceDecision
      ? 2
      : 4;

  const runAction = (action: PrototypeAction, success: string) => {
    if (!selected) return;
    try {
      const updated = applySmsPrototypeAction(selected, action);
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setFeedback(success);
      setFollowUpNote("");
      if (action.type === "restrict") setRestrictionAuthorized(false);
      if (action.type === "simulate_response") setResponseBody("");
      if (action.type === "add_internal_note") setInternalNote("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "That change could not be saved to the sample message.");
    }
  };

  const saveIntakeDecision = () => {
    if (!selected || !canMakeRelevanceDecision) return;
    if (intakeDecision === "not_bafe_project") {
      runAction({ type: "mark_not_bafe_project", reason: decisionReason }, "Marked as not a BAFE project. No official issue was created.");
      return;
    }
    if (intakeDecision === "duplicate") {
      runAction({ type: "mark_duplicate", reason: decisionReason, duplicateOf }, "Sample record linked as a possible duplicate. No new official issue was created.");
      return;
    }
    runAction({
      type: "accept",
      category,
      relevanceReason: decisionReason || selected.relevanceReason,
      location: locationTag,
      unit: assignedUnit,
      region: assignedRegion,
      project: selectedProject ? {
        id: selectedProject.sourceId || selectedProject.id,
        name: selectedProject.name,
        code: selectedProject.sourceProjectId,
        province: selectedProject.province,
        municipality: selectedProject.municipality,
      } : null,
      confirmed: true,
    }, "BAFE project tagged and sample case created. It remains inside this prototype.");
  };

  // The region tag routes the case, so it comes from the confirmed project record
  // rather than being typed separately — a moderator can still overwrite it below if a
  // project's stored region is stale, but it's never left to guesswork by default.
  const handleSelectedProjectChange = (project: SelectedProject | null) => {
    setSelectedProject(project);
    if (project?.region) setAssignedRegion(project.region);
  };

  const intakeButtonLabel = intakeDecision === "bafe_project"
    ? "Tag project and create sample case"
    : intakeDecision === "not_bafe_project"
      ? "Mark as not a BAFE project"
      : "Link as possible copy";

  return (
    <div className="space-y-5">
      <SmsPrototypeBanner />

      <Link href="/issues/sms-review" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to sample messages
      </Link>

      {!selected ? (
        <section className="border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          This sample message is not available. It may have been restored to its original state on another tab.
        </section>
      ) : (
        <>
          <SmsCaseLifecycleStepper currentStep={currentStep} closedLabel={closedLabelFor(selected) ?? undefined} />

          <section aria-labelledby="selected-sms-title" className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SmsGrievanceHeader record={selected} />

            <div className="space-y-6 p-4 sm:p-5">
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Step 1 · Received</h3>
                <SmsGrievanceSummary record={selected} />
              </div>

              {canMakeRelevanceDecision ? (
                <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Steps 2–3 · Check relevance &amp; identify project</h3>
                  <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Decide whether this belongs in InfraWatch, then, if it does, find the actual project. The original message will not be changed.
                  </p>
                  <SmsProjectTaggingWizard
                    key={selected.id}
                    intakeDecision={intakeDecision}
                    onIntakeDecisionChange={setIntakeDecision}
                    category={category}
                    onCategoryChange={setCategory}
                    locationTag={locationTag}
                    onLocationTagChange={setLocationTag}
                    selectedProject={selectedProject}
                    onSelectedProjectChange={handleSelectedProjectChange}
                    decisionReason={decisionReason}
                    onDecisionReasonChange={setDecisionReason}
                    duplicateOf={duplicateOf}
                    onDuplicateOfChange={setDuplicateOf}
                    assignedUnit={assignedUnit}
                    onAssignedUnitChange={setAssignedUnit}
                    assignedRegion={assignedRegion}
                    onAssignedRegionChange={setAssignedRegion}
                    intakeButtonLabel={intakeButtonLabel}
                    onSaveIntakeDecision={saveIntakeDecision}
                  />
                </div>
              ) : isClosedWithoutCase ? null : (
                <>
                  <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Steps 2–3 · Already confirmed</h3>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Confirmed as a BAFE project</p>
                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                        {selected.projectLabel} — {selected.categoryLabel}
                        {selected.assignedRegion ? ` · ${selected.assignedRegion}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Step 4 · Respond &amp; resolve</h3>
                    <SmsCaseResponsePanel
                      lifecycleAction={lifecycleAction}
                      responseBody={responseBody}
                      onResponseBodyChange={setResponseBody}
                      assignedUnit={assignedUnit}
                      onAssignedUnitChange={setAssignedUnit}
                      assignedRegion={assignedRegion}
                      onAssignedRegionChange={setAssignedRegion}
                      followUpNote={followUpNote}
                      onFollowUpNoteChange={setFollowUpNote}
                      internalNote={internalNote}
                      onInternalNoteChange={setInternalNote}
                      restrictionAuthorized={restrictionAuthorized}
                      onRestrictionAuthorizedChange={setRestrictionAuthorized}
                      onRunAction={runAction}
                    />
                  </div>
                </>
              )}

              <SmsConversationTimeline conversation={selected.conversation} />

              <p className="border-t border-slate-200 pt-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200" aria-live="polite">{feedback}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

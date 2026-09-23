"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { SmsCaseLifecycleStepper } from "@/components/admin/issues/sms-case-lifecycle-stepper";
import { SmsCaseResponsePanel } from "@/components/admin/issues/sms-case-response-panel";
import { SmsConversationTimeline } from "@/components/admin/issues/sms-conversation-timeline";
import { SmsGrievanceHeader, SmsGrievanceMessageCard, SmsGrievanceMetadataCard } from "@/components/admin/issues/sms-grievance-summary";
import { SmsProjectTaggingWizard } from "@/components/admin/issues/sms-project-tagging-wizard";
import type { IntakeDecision } from "@/components/admin/issues/sms-project-tagging-wizard";
import { SmsPrototypeBanner } from "@/components/admin/issues/sms-prototype-banner";
import type { SelectedProject } from "@/components/ui/project-search-input";
import { readSmsPrototypeRecords, writeSmsPrototypeRecords } from "@/lib/sms-grievance/mock-store";
import { nextSmsCaseStatuses } from "@/lib/sms-grievance/policy";
import { applySmsPrototypeAction, type PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import { SMS_CASE_STATUS_LABELS } from "@/lib/sms-grievance/queue";
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
  const [assignedUnit, setAssignedUnit] = useState(selected?.assignedUnit ?? "");
  const [assignedRegion, setAssignedRegion] = useState(selected?.assignedRegion ?? "");
  const [statusTarget, setStatusTarget] = useState<SmsCaseStatus | "">("");
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [responseBody, setResponseBody] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [feedback, setFeedback] = useState("");

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
        setAssignedUnit(match.assignedUnit ?? "");
        setAssignedRegion(match.assignedRegion ?? "");
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [id, initialRecords]);

  useEffect(() => {
    if (storageReady) writeSmsPrototypeRecords(window.localStorage, records);
  }, [records, storageReady]);

  const canMakeRelevanceDecision = selected?.status === "needs_relevance_review";
  const isClosedWithoutCase = selected ? closedLabelFor(selected) !== null : false;
  const isTagged = Boolean(selected) && !canMakeRelevanceDecision && !isClosedWithoutCase;
  // Being tagged only means a project was identified — reply, notes, and status
  // changes stay locked until the case is actually routed to a region and team.
  const isLinked = isTagged && Boolean(selected?.assignedUnit) && Boolean(selected?.assignedRegion);
  const statusOptions = isLinked && selected
    ? nextSmsCaseStatuses(selected.status).map((value) => ({ value, label: SMS_CASE_STATUS_LABELS[value] }))
    : [];

  const currentStep: 1 | 2 | 3 | null = !selected || isClosedWithoutCase
    ? null
    : canMakeRelevanceDecision
      ? 2
      : 3;

  const runAction = (action: PrototypeAction, success: string) => {
    if (!selected) return;
    try {
      const updated = applySmsPrototypeAction(selected, action);
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setFeedback(success);
      if (action.type === "transition") {
        setStatusChangeReason("");
        setStatusTarget("");
      }
      if (action.type === "simulate_response") setResponseBody("");
      if (action.type === "add_internal_note") setInternalNote("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "That change could not be saved.");
    }
  };

  const saveIntakeDecision = () => {
    if (!selected || !canMakeRelevanceDecision) return;
    if (intakeDecision === "not_bafe_project") {
      runAction({ type: "mark_not_bafe_project", reason: decisionReason }, "Marked as not a BAFE project. No official issue was created.");
      return;
    }
    const project = selectedProject ? {
      id: selectedProject.sourceId || selectedProject.id,
      name: selectedProject.name,
      code: selectedProject.sourceProjectId,
      province: selectedProject.province,
      municipality: selectedProject.municipality,
    } : null;
    if (intakeDecision === "possible_bafe_project") {
      runAction({
        type: "accept",
        category,
        relevanceReason: decisionReason || selected.relevanceReason,
        location: locationTag,
        unit: assignedUnit,
        region: assignedRegion,
        project,
        confirmed: true,
        certainty: "possible",
      }, "Possible BAFE project tagged. Case created for confirmation.");
      return;
    }
    runAction({
      type: "accept",
      category,
      relevanceReason: decisionReason || selected.relevanceReason,
      location: locationTag,
      unit: assignedUnit,
      region: assignedRegion,
      project,
      confirmed: true,
      certainty: "confirmed",
    }, "BAFE project tagged and case created.");
  };

  // The region tag routes the case, so it comes from the confirmed project record
  // rather than being typed separately — a moderator can still overwrite it below if a
  // project's stored region is stale, but it's never left to guesswork by default.
  const handleSelectedProjectChange = (project: SelectedProject | null) => {
    setSelectedProject(project);
    if (project?.region) setAssignedRegion(project.region);
  };

  const intakeButtonLabel = intakeDecision === "bafe_project"
    ? "Tag project and create case"
    : intakeDecision === "possible_bafe_project"
      ? "Tag as possible match and create case"
      : "Mark as not a BAFE project";

  return (
    <div className="space-y-5">
      <SmsPrototypeBanner />

      <Link href="/issues/sms-review" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to sample messages
      </Link>

      {!selected ? (
        <section className="border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          This message is not available. It may have been restored to its original state on another tab.
        </section>
      ) : (
        <>
          <SmsCaseLifecycleStepper currentStep={currentStep} closedLabel={closedLabelFor(selected) ?? undefined} />

          <section aria-labelledby="selected-sms-title" className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SmsGrievanceHeader record={selected} />

            <div className="p-4 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                  <SmsGrievanceMessageCard record={selected} />

                  {canMakeRelevanceDecision ? (
                    <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                      <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review &amp; tag</h3>
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
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review &amp; tag</h3>
                        {selected.relevance === "confirmed_in_scope" ? (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Confirmed as a BAFE project</p>
                            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                              {selected.projectLabel} — {selected.categoryLabel}
                              {selected.assignedRegion ? ` · ${selected.assignedRegion}` : ""}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Possible BAFE project — pending confirmation</p>
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                              {selected.projectLabel} — {selected.categoryLabel}
                              {selected.assignedRegion ? ` · ${selected.assignedRegion}` : ""}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Respond &amp; resolve</h3>
                        <SmsCaseResponsePanel
                          isLinked={isLinked}
                          responseBody={responseBody}
                          onResponseBodyChange={setResponseBody}
                          assignedUnit={assignedUnit}
                          onAssignedUnitChange={setAssignedUnit}
                          assignedRegion={assignedRegion}
                          onAssignedRegionChange={setAssignedRegion}
                          internalNote={internalNote}
                          onInternalNoteChange={setInternalNote}
                          onRunAction={runAction}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
                  <SmsGrievanceMetadataCard
                    record={selected}
                    statusOptions={statusOptions}
                    statusTarget={statusTarget}
                    onStatusTargetChange={setStatusTarget}
                    statusChangeReason={statusChangeReason}
                    onStatusChangeReasonChange={setStatusChangeReason}
                    onConfirmStatusChange={() => {
                      if (!statusTarget) return;
                      runAction(
                        { type: "transition", to: statusTarget, reason: statusChangeReason, authorized: statusTarget === "closed" },
                        `Grievance status changed to ${SMS_CASE_STATUS_LABELS[statusTarget]}.`,
                      );
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <SmsConversationTimeline conversation={selected.conversation} />
                <p className="border-t border-slate-200 pt-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200" aria-live="polite">{feedback}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

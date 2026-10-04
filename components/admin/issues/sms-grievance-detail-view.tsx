"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { SmsCaseLifecycleStepper } from "@/components/admin/issues/sms-case-lifecycle-stepper";
import { SmsCaseResponsePanel } from "@/components/admin/issues/sms-case-response-panel";
import { SmsConversationTimeline } from "@/components/admin/issues/sms-conversation-timeline";
import { SmsGrievanceHeader, SmsGrievanceMessageCard, SmsGrievanceMetadataCard } from "@/components/admin/issues/sms-grievance-summary";
import { SmsGrievanceMap } from "@/components/admin/issues/sms-grievance-map";
import { SmsProjectTaggingWizard } from "@/components/admin/issues/sms-project-tagging-wizard";
import type { IntakeDecision } from "@/components/admin/issues/sms-project-tagging-wizard";
import { SmsPrototypeBanner } from "@/components/admin/issues/sms-prototype-banner";
import { Button } from "@/components/ui/button";
import type { SelectedProject } from "@/components/ui/project-search-input";
import { sendSimulatedAcknowledgmentSms } from "@/actions/mutation/sms-grievance.mutation";
import { DEFAULT_SMS_CATEGORY } from "@/lib/sms-grievance/categories";
import { readSmsPrototypeRecords, writeSmsPrototypeRecords } from "@/lib/sms-grievance/mock-store";
import { nextSmsCaseStatuses } from "@/lib/sms-grievance/policy";
import { applySmsPrototypeAction, type PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import { SMS_CASE_STATUS_LABELS } from "@/lib/sms-grievance/queue";
import { appendFollowUpMessage, findLatestThreadForContact } from "@/lib/sms-grievance/simulate-incoming";
import type { SmsCaseStatus, SmsCategory, SmsMockScenario, SmsNotBafeCategory } from "@/types/sms-grievance.types";
import { TutorialModeNotice } from "@/components/admin/tour/tutorial-sandbox";
import { applyTutorialSmsReply } from "@/lib/tours/sms-sandbox";
import { isTutorialRecord } from "@/lib/tours/sandbox";
import { notifyTutorialAction } from "@/lib/tours/events";

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

export function SmsGrievanceDetailView({
  id,
  initialRecords,
  dataSource = "sample",
  liveFetchError = false,
  tutorial = false,
}: {
  id: string;
  initialRecords: SmsMockScenario[];
  dataSource?: "live" | "sample";
  liveFetchError?: boolean;
  tutorial?: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [storageReady, setStorageReady] = useState(false);
  const selected = records.find((item) => item.id === id) ?? null;

  const [intakeDecision, setIntakeDecision] = useState<IntakeDecision>("bafe_project");
  const [category, setCategory] = useState<SmsCategory>(selected?.category ?? DEFAULT_SMS_CATEGORY);
  const [locationTag, setLocationTag] = useState(selected?.locationLabel ?? "");
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(projectSelection(selected ?? undefined));
  const [decisionReason, setDecisionReason] = useState("");
  const [notBafeCategory, setNotBafeCategory] = useState<SmsNotBafeCategory>("not_related_to_infrawatch");
  const [assignedRegion, setAssignedRegion] = useState(selected?.assignedRegion ?? "");
  const [statusTarget, setStatusTarget] = useState<SmsCaseStatus | "">("");
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [responseBody, setResponseBody] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dismissedThreadSuggestionFor, setDismissedThreadSuggestionFor] = useState<string | null>(null);
  const [linkingThread, setLinkingThread] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (tutorial) return;
    const timeout = window.setTimeout(() => {
      const stored = readSmsPrototypeRecords(window.localStorage, initialRecords);
      setRecords(stored);
      setStorageReady(true);
      const match = stored.find((item) => item.id === id);
      if (match) {
        setCategory(match.category ?? DEFAULT_SMS_CATEGORY);
        setLocationTag(match.locationLabel);
        setSelectedProject(projectSelection(match));
        setAssignedRegion(match.assignedRegion ?? "");
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [id, initialRecords, tutorial]);

  useEffect(() => {
    if (storageReady && !tutorial) writeSmsPrototypeRecords(window.localStorage, records);
  }, [records, storageReady, tutorial]);

  const canMakeRelevanceDecision = selected?.status === "needs_relevance_review";
  // A record that's already received more than one inbound message is already the main,
  // consolidated thread for that sender (something was already linked into it, or it
  // absorbed a follow-up) — suggesting to link it into something else would be merging
  // the main thread into a side one, backwards from what "link" is supposed to do.
  const isAlreadyMainThread = (selected?.conversation.filter((item) => item.kind === "inbound_sms").length ?? 0) > 1;
  // Decided here, at review time, rather than the moment a message is simulated/received —
  // a real incoming message has no step where anyone could make that call earlier, so this
  // has to be where staff can link it to an existing case from the same sender.
  const matchedThread = canMakeRelevanceDecision && selected && !isAlreadyMainThread
    ? findLatestThreadForContact(records, selected.contactNumber, selected.id)
    : null;
  const showThreadSuggestion = Boolean(matchedThread) && dismissedThreadSuggestionFor !== selected?.id;
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

  const runAction = async (action: PrototypeAction, success: string) => {
    if (!selected) return;
    if (tutorial) {
      if (action.type !== "simulate_response") return;
      try {
        const updated = applyTutorialSmsReply(selected, action.body);
        setRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
        setResponseBody("");
        setFeedback("Example reply added. No SMS was sent or saved.");
        notifyTutorialAction({ resource: "sms", recordId: selected.id, action: "reply", outcome: "success", simulated: true });
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Enter an example reply.");
        notifyTutorialAction({ resource: "sms", recordId: selected.id, action: "reply", outcome: "error", simulated: true });
      }
      return;
    }
    if (isTutorialRecord(selected.id)) return;
    setActionPending(true);
    try {
      let finalRecord = applySmsPrototypeAction(selected, action);
      let finalSuccess = success;

      // A manual reply on a staff-simulated test case actually goes out over the real
      // gateway, same as the auto-acknowledgment and thread-link replies — never for a
      // static fixture or a real citizen's live-feed number.
      if (action.type === "simulate_response" && selected.localSimulated) {
        const replyItem = finalRecord.conversation.at(-1);
        if (replyItem) {
          const plainBody = action.body.trim();
          const sendResult = await sendSimulatedAcknowledgmentSms(finalRecord.contactNumber, plainBody);
          const deliveryStatus = sendResult.success ? "sent" as const : "send_failed" as const;
          finalRecord = {
            ...finalRecord,
            deliveryStatus,
            conversation: finalRecord.conversation.map((item) => item.id === replyItem.id ? { ...item, body: plainBody, deliveryStatus } : item),
          };
          finalSuccess = sendResult.success
            ? "Reply sent as a real SMS."
            : `Reply failed to send as a real SMS: ${sendResult.error ?? "unknown error"}.`;
        }
      }

      setRecords((current) => current.map((item) => (item.id === finalRecord.id ? finalRecord : item)));
      setFeedback(finalSuccess);
      if (action.type === "transition") {
        setStatusChangeReason("");
        setStatusTarget("");
      }
      if (action.type === "simulate_response") setResponseBody("");
      if (action.type === "add_internal_note") setInternalNote("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "That change could not be saved.");
    } finally {
      setActionPending(false);
    }
  };

  const saveIntakeDecision = () => {
    if (!selected || !canMakeRelevanceDecision) return;
    if (intakeDecision === "not_bafe_project") {
      runAction({ type: "mark_not_bafe_project", reason: decisionReason, category: notBafeCategory }, "Marked as not a BAFE project. No official issue was created.");
      return;
    }
    const project = selectedProject ? {
      id: selectedProject.sourceId || selectedProject.id,
      name: selectedProject.name,
      code: selectedProject.sourceProjectId,
      province: selectedProject.province,
      municipality: selectedProject.municipality,
    } : null;
    // Region is the only routing input staff provide — the record still carries a
    // separate "responsible office" field (other screens display it), so it's set to
    // match the region rather than asked for twice.
    if (intakeDecision === "possible_bafe_project") {
      runAction({
        type: "accept",
        category,
        relevanceReason: decisionReason || selected.relevanceReason,
        location: locationTag,
        unit: assignedRegion,
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
      unit: assignedRegion,
      region: assignedRegion,
      project,
      confirmed: true,
      certainty: "confirmed",
    }, "BAFE project tagged and case created.");
  };

  // Merges this message into an existing case from the same sender instead of tagging it
  // as its own report — reuses the same "mark_duplicate" mechanism staff already have for
  // linking a copy to an earlier message, just pre-filled with the detected match.
  const linkToExistingThread = async () => {
    if (tutorial) return;
    if (!selected || !matchedThread) return;
    setLinkingThread(true);
    try {
      const updatedThread = appendFollowUpMessage(matchedThread, selected.originalText);
      const ackItem = [...updatedThread.conversation].reverse().find((item) => item.kind === "outbound_sms");
      // Only ever really sends when the target thread is a staff-simulated test case —
      // never for a real citizen's live-feed number, consistent with every other
      // real-send path in this module.
      const finalThread = ackItem && updatedThread.localSimulated
        ? await (async () => {
            const sendResult = await sendSimulatedAcknowledgmentSms(updatedThread.contactNumber, ackItem.body);
            const deliveryStatus = sendResult.success ? "sent" as const : "send_failed" as const;
            return {
              ...updatedThread,
              deliveryStatus,
              conversation: updatedThread.conversation.map((item) => item.id === ackItem.id ? { ...item, deliveryStatus } : item),
            };
          })()
        : updatedThread;

      const markedDuplicate = applySmsPrototypeAction(selected, {
        type: "mark_duplicate",
        reason: `Linked to existing case ${matchedThread.externalMessageId} from the same sender.`,
        duplicateOf: matchedThread.id,
      });

      setRecords((current) => current.map((item) => {
        if (item.id === finalThread.id) return finalThread;
        if (item.id === markedDuplicate.id) return markedDuplicate;
        return item;
      }));
      setFeedback(`Linked to case ${matchedThread.externalMessageId}. This message is now part of that thread.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not link this message to that case.");
    } finally {
      setLinkingThread(false);
    }
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
      ? (selectedProject ? "Tag as possible match and create case" : "Tag for follow-up and create case")
      : "Mark as not a BAFE project";

  return (
    <div className="space-y-5">
      {tutorial ? <TutorialModeNotice /> : <SmsPrototypeBanner dataSource={dataSource} liveFetchError={liveFetchError} />}

      <Link href={tutorial ? "/learn/sms-grievances" : "/issues/sms-review"} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> {dataSource === "live" ? "Back to messages" : "Back to sample messages"}
      </Link>

      {!selected ? (
        <section className="border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          This message is not available. It may have been restored to its original state on another tab.
        </section>
      ) : (
        <>
          <SmsCaseLifecycleStepper currentStep={currentStep} closedLabel={closedLabelFor(selected) ?? undefined} />

          <section data-tour="sms-detail" data-tour-record-id={selected.id} aria-labelledby="selected-sms-title" className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SmsGrievanceHeader record={selected} />

            <div className="p-4 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                  <SmsGrievanceMessageCard record={selected} />
                  <SmsGrievanceMap records={[selected]} singleMessage />

                  {showThreadSuggestion && matchedThread && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
                      <p className="text-sm font-bold text-sky-900 dark:text-sky-200">Same sender as an existing case</p>
                      <p className="mt-1 text-sm text-sky-800 dark:text-sky-300">
                        {selected.contactNumber} already has case {matchedThread.externalMessageId} ({SMS_CASE_STATUS_LABELS[matchedThread.status]}, received {new Date(matchedThread.receivedAt).toLocaleString()}).
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" disabled={linkingThread} className="min-h-11 font-medium" onClick={linkToExistingThread}>
                          {linkingThread ? "Linking…" : `Link to case ${matchedThread.externalMessageId}`}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={linkingThread}
                          className="min-h-11 font-medium"
                          onClick={() => setDismissedThreadSuggestionFor(selected.id)}
                        >
                          Keep as a separate report
                        </Button>
                      </div>
                    </div>
                  )}

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
                        notBafeCategory={notBafeCategory}
                        onNotBafeCategoryChange={setNotBafeCategory}
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
                          tutorial={tutorial}
                          isLinked={isLinked}
                          responseBody={responseBody}
                          onResponseBodyChange={setResponseBody}
                          assignedRegion={assignedRegion}
                          onAssignedRegionChange={setAssignedRegion}
                          currentRegion={selected.assignedRegion ?? ""}
                          internalNote={internalNote}
                          onInternalNoteChange={setInternalNote}
                          onRunAction={runAction}
                          disabled={actionPending}
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

              <div data-tour="sms-history" className="mt-6 space-y-4">
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

import { MessageSquareText, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SmsProjectTaggingWizard } from "@/components/admin/issues/sms-project-tagging-wizard";
import type { IntakeDecision } from "@/components/admin/issues/sms-project-tagging-wizard";
import type { SelectedProject } from "@/components/ui/project-search-input";
import type { PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import type { SmsCaseStatus, SmsCategory, SmsMockScenario } from "@/types/sms-grievance.types";

export type { IntakeDecision } from "@/components/admin/issues/sms-project-tagging-wizard";

export function SmsPrototypeActions({
  selected,
  canMakeRelevanceDecision,
  lifecycleAction,
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
  restrictionAuthorized,
  onRestrictionAuthorizedChange,
  responseBody,
  onResponseBodyChange,
  internalNote,
  onInternalNoteChange,
  intakeButtonLabel,
  onSaveIntakeDecision,
  onRunAction,
}: {
  selected: SmsMockScenario;
  canMakeRelevanceDecision: boolean;
  lifecycleAction: { to: SmsCaseStatus; label: string } | null;
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
  restrictionAuthorized: boolean;
  onRestrictionAuthorizedChange: (value: boolean) => void;
  responseBody: string;
  onResponseBodyChange: (value: string) => void;
  internalNote: string;
  onInternalNoteChange: (value: string) => void;
  intakeButtonLabel: string;
  onSaveIntakeDecision: () => void;
  onRunAction: (action: PrototypeAction, success: string) => void;
}) {
  return (
    <>
      <section aria-labelledby="tag-and-route-title" className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 id="tag-and-route-title" className="font-heading text-lg font-semibold">Tag this grievance to a project</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Select the actual project from the InfraWatch BAFE project records. If there is no match, mark it as not a BAFE project. The original message will not be changed.
        </p>

        {canMakeRelevanceDecision ? (
          <div className="mt-4">
            <SmsProjectTaggingWizard
              key={selected.id}
              intakeDecision={intakeDecision}
              onIntakeDecisionChange={onIntakeDecisionChange}
              category={category}
              onCategoryChange={onCategoryChange}
              locationTag={locationTag}
              onLocationTagChange={onLocationTagChange}
              selectedProject={selectedProject}
              onSelectedProjectChange={onSelectedProjectChange}
              decisionReason={decisionReason}
              onDecisionReasonChange={onDecisionReasonChange}
              duplicateOf={duplicateOf}
              onDuplicateOfChange={onDuplicateOfChange}
              assignedUnit={assignedUnit}
              onAssignedUnitChange={onAssignedUnitChange}
              assignedRegion={assignedRegion}
              onAssignedRegionChange={onAssignedRegionChange}
              intakeButtonLabel={intakeButtonLabel}
              onSaveIntakeDecision={onSaveIntakeDecision}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            This intake decision is already recorded. Restore the sample messages to review it again.
          </p>
        )}
      </section>

      {selected.relevance === "confirmed_in_scope" && (
        <details className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <summary className="min-h-11 cursor-pointer py-2 font-heading text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Case follow-up
          </summary>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Update routing, project confirmation, access, or case status only when needed.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Responsible office or review team
              <input value={assignedUnit} onChange={(event) => onAssignedUnitChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">
              Region
              <input value={assignedRegion} onChange={(event) => onAssignedRegionChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Follow-up note
              <input value={decisionReason} onChange={(event) => onDecisionReasonChange(event.target.value)} placeholder="Explain the assignment or status change" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" className="min-h-11 px-4" onClick={() => onRunAction({ type: "assign", unit: assignedUnit, region: assignedRegion, confirmed: true }, "Sample routing tags updated by staff action.")}>
              Update routing tags
            </Button>
            {lifecycleAction && (
              <Button type="button" variant="outline" className="min-h-11 px-4" onClick={() => onRunAction({ type: "transition", to: lifecycleAction.to, reason: decisionReason, authorized: lifecycleAction.to === "closed" }, `${lifecycleAction.label} completed in local sample state.`)}>
                {lifecycleAction.label}
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={restrictionAuthorized} onChange={(event) => onRestrictionAuthorizedChange(event.target.checked)} className="size-5" />
              I am authorized to limit access to this sample
            </label>
            <Button type="button" variant="outline" className="min-h-11 px-4" disabled={!restrictionAuthorized} onClick={() => onRunAction({ type: "restrict", reason: decisionReason, authorized: restrictionAuthorized }, "Sample record restricted in this prototype.")}>
              <ShieldAlert aria-hidden="true" className="size-4" /> Limit sample access
            </Button>
          </div>
        </details>
      )}

      {selected.relevance === "confirmed_in_scope" && (
        <details className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <summary className="min-h-11 cursor-pointer py-2 font-heading text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Reply or add a staff note
          </summary>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <label className="text-sm font-bold" htmlFor="simulated-response">Reply to sender (simulation)</label>
              <textarea id="simulated-response" value={responseBody} onChange={(event) => onResponseBodyChange(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950" placeholder="Write a sample reply. Nothing will be sent." />
              <Button type="button" variant="outline" className="mt-2 min-h-11 w-full px-4" onClick={() => onRunAction({ type: "simulate_response", body: responseBody }, "SAMPLE SMS ONLY. No message was sent.")}>
                <MessageSquareText aria-hidden="true" className="size-4" /> Simulate SMS response
              </Button>
            </div>
            <div>
              <label className="text-sm font-bold" htmlFor="internal-note">Internal note</label>
              <textarea id="internal-note" value={internalNote} onChange={(event) => onInternalNoteChange(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950" placeholder="Visible to prototype staff only" />
              <Button type="button" variant="outline" className="mt-2 min-h-11 w-full px-4" onClick={() => onRunAction({ type: "add_internal_note", body: internalNote }, "Internal sample note added. It was not included in an SMS response.")}>
                Add internal note
              </Button>
            </div>
          </div>
        </details>
      )}
    </>
  );
}

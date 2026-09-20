import { MessageSquareText, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import type { SmsCaseStatus } from "@/types/sms-grievance.types";

export function SmsCaseResponsePanel({
  lifecycleAction,
  responseBody,
  onResponseBodyChange,
  assignedUnit,
  onAssignedUnitChange,
  assignedRegion,
  onAssignedRegionChange,
  followUpNote,
  onFollowUpNoteChange,
  internalNote,
  onInternalNoteChange,
  restrictionAuthorized,
  onRestrictionAuthorizedChange,
  onRunAction,
}: {
  lifecycleAction: { to: SmsCaseStatus; label: string } | null;
  responseBody: string;
  onResponseBodyChange: (value: string) => void;
  assignedUnit: string;
  onAssignedUnitChange: (value: string) => void;
  assignedRegion: string;
  onAssignedRegionChange: (value: string) => void;
  followUpNote: string;
  onFollowUpNoteChange: (value: string) => void;
  internalNote: string;
  onInternalNoteChange: (value: string) => void;
  restrictionAuthorized: boolean;
  onRestrictionAuthorizedChange: (value: boolean) => void;
  onRunAction: (action: PrototypeAction, success: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-bold" htmlFor="simulated-response">Reply to sender (simulation)</label>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Nothing will be sent — this records what a real reply would say once a provider is connected.</p>
        <textarea
          id="simulated-response"
          value={responseBody}
          onChange={(event) => onResponseBodyChange(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
          placeholder="Write a sample reply telling the sender what's happening next."
        />
        <Button
          type="button"
          className="mt-2 min-h-11 px-4"
          onClick={() => onRunAction({ type: "simulate_response", body: responseBody }, "SAMPLE SMS ONLY. No message was sent.")}
        >
          <MessageSquareText aria-hidden="true" className="size-4" /> Simulate SMS response
        </Button>
      </div>

      {lifecycleAction && (
        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="text-sm font-bold">Case status</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Move this case forward once the reply above reflects what actually happened.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 px-4"
            onClick={() => onRunAction(
              { type: "transition", to: lifecycleAction.to, reason: followUpNote, authorized: lifecycleAction.to === "closed" },
              `${lifecycleAction.label} completed in local sample state.`,
            )}
          >
            {lifecycleAction.label}
          </Button>
        </div>
      )}

      <details className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <summary className="min-h-11 cursor-pointer py-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          More options: routing, internal notes, restricted access
        </summary>

        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-semibold">Update routing</p>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
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
                <input value={followUpNote} onChange={(event) => onFollowUpNoteChange(event.target.value)} placeholder="Explain the assignment or status change" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11 px-4"
              onClick={() => onRunAction({ type: "assign", unit: assignedUnit, region: assignedRegion, confirmed: true }, "Sample routing tags updated by staff action.")}
            >
              Update routing tags
            </Button>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="internal-note">Internal note</label>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Visible to staff only — never sent to the sender.</p>
            <textarea
              id="internal-note"
              value={internalNote}
              onChange={(event) => onInternalNoteChange(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
              placeholder="Visible to prototype staff only"
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2 min-h-11 px-4"
              onClick={() => onRunAction({ type: "add_internal_note", body: internalNote }, "Internal sample note added. It was not included in an SMS response.")}
            >
              Add internal note
            </Button>
          </div>

          <div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={restrictionAuthorized} onChange={(event) => onRestrictionAuthorizedChange(event.target.checked)} className="size-5" />
              I am authorized to limit access to this sample
            </label>
            <Button
              type="button"
              variant="outline"
              className="mt-2 min-h-11 px-4"
              disabled={!restrictionAuthorized}
              onClick={() => onRunAction({ type: "restrict", reason: followUpNote, authorized: restrictionAuthorized }, "Sample record restricted in this prototype.")}
            >
              <ShieldAlert aria-hidden="true" className="size-4" /> Limit sample access
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MapPin, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmsRegionSelect } from "@/components/admin/issues/sms-region-select";
import type { PrototypeAction } from "@/lib/sms-grievance/prototype-state";

export function SmsCaseResponsePanel({
  isLinked,
  assignedRegion,
  onAssignedRegionChange,
  currentRegion,
  internalNote,
  onInternalNoteChange,
  onRunAction,
  disabled = false,
  tutorial = false,
}: {
  isLinked: boolean;
  assignedRegion: string;
  onAssignedRegionChange: (value: string) => void;
  /** The region actually saved on the case right now — lets this panel show that routing
   * is already in place and disable "Save" until the staff member actually picks a
   * different region, instead of implying every visit needs a fresh save. */
  currentRegion: string;
  internalNote: string;
  onInternalNoteChange: (value: string) => void;
  onRunAction: (action: PrototypeAction, success: string) => void | Promise<void>;
  /** True while an action is in flight (e.g. a reply actually sending as a real SMS) —
   * disables every button here so a slow real send can't be triggered twice. */
  disabled?: boolean;
  tutorial?: boolean;
}) {
  const [activeTab, setActiveTab] = useState("routing");
  const regionUnchanged = assignedRegion.trim() === currentRegion.trim();

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as string)}>
      <TabsList variant="line" className="w-full flex-wrap justify-start gap-0">
        <TabsTrigger value="routing" disabled={tutorial}>
          <MapPin className="size-3.5" /> Assign &amp; route
        </TabsTrigger>
        {isLinked && (
          <TabsTrigger value="note" disabled={tutorial}>
            <StickyNote className="size-3.5" /> Internal note
          </TabsTrigger>
        )}
      </TabsList>

      {!isLinked && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Replying (in the conversation below) and adding internal notes unlock once this case is linked to a responsible office and region below.
        </p>
      )}

      <TabsContent value="routing" className="mt-4 space-y-3">
        {isLinked && currentRegion.trim() && (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Currently assigned to {currentRegion}.</p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isLinked ? "Pick a different region only if this case needs to move to another team." : "Change who is handling this case."}
        </p>
        <label className="block text-sm font-semibold" htmlFor="response-panel-assigned-region">
          Region
          <SmsRegionSelect id="response-panel-assigned-region" value={assignedRegion} onChange={onAssignedRegionChange} />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={regionUnchanged || disabled}
          className="min-h-11 px-4"
          onClick={() => onRunAction({ type: "assign", unit: assignedRegion, region: assignedRegion, confirmed: true }, "Routing updated.")}
        >
          {regionUnchanged ? "Already assigned to this region" : "Save assignment"}
        </Button>
      </TabsContent>

      {isLinked && (
        <TabsContent value="note" className="mt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Visible to staff only — never sent to the sender.</p>
          <label className="sr-only" htmlFor="internal-note">Internal note text</label>
          <textarea
            id="internal-note"
            value={internalNote}
            onChange={(event) => onInternalNoteChange(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
            placeholder="Add a note for the review team"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-11 px-4"
            onClick={() => onRunAction({ type: "add_internal_note", body: internalNote }, "Internal note added.")}
          >
            Add note
          </Button>
        </TabsContent>
      )}
    </Tabs>
  );
}

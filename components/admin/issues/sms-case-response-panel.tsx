"use client";

import { useState } from "react";
import { MapPin, MessageSquareText, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmsRegionSelect } from "@/components/admin/issues/sms-region-select";
import type { PrototypeAction } from "@/lib/sms-grievance/prototype-state";

export function SmsCaseResponsePanel({
  isLinked,
  responseBody,
  onResponseBodyChange,
  assignedUnit,
  onAssignedUnitChange,
  assignedRegion,
  onAssignedRegionChange,
  internalNote,
  onInternalNoteChange,
  onRunAction,
}: {
  isLinked: boolean;
  responseBody: string;
  onResponseBodyChange: (value: string) => void;
  assignedUnit: string;
  onAssignedUnitChange: (value: string) => void;
  assignedRegion: string;
  onAssignedRegionChange: (value: string) => void;
  internalNote: string;
  onInternalNoteChange: (value: string) => void;
  onRunAction: (action: PrototypeAction, success: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(isLinked ? "reply" : "routing");

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as string)}>
      <TabsList variant="line" className="w-full flex-wrap justify-start gap-0">
        {isLinked && (
          <TabsTrigger value="reply">
            <MessageSquareText className="size-3.5" /> Reply
          </TabsTrigger>
        )}
        <TabsTrigger value="routing">
          <MapPin className="size-3.5" /> Assign &amp; route
        </TabsTrigger>
        {isLinked && (
          <TabsTrigger value="note">
            <StickyNote className="size-3.5" /> Internal note
          </TabsTrigger>
        )}
      </TabsList>

      {!isLinked && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Replying and adding internal notes unlock once this case is linked to a responsible office and region below.
        </p>
      )}

      {isLinked && (
        <TabsContent value="reply" className="mt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">This reply is sent to the sender by SMS.</p>
          <label className="sr-only" htmlFor="simulated-response">Reply text</label>
          <textarea
            id="simulated-response"
            value={responseBody}
            onChange={(event) => onResponseBodyChange(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
            placeholder="Write a reply telling the sender what's happening next."
          />
          <Button
            type="button"
            className="min-h-11 px-4"
            onClick={() => onRunAction({ type: "simulate_response", body: responseBody }, "Reply sent.")}
          >
            <MessageSquareText aria-hidden="true" className="size-4" /> Send reply
          </Button>
        </TabsContent>
      )}

      <TabsContent value="routing" className="mt-4 space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Change who is handling this case.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Responsible office or review team
            <input
              value={assignedUnit}
              onChange={(event) => onAssignedUnitChange(event.target.value)}
              placeholder="e.g., Regional Field Office"
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="text-sm font-semibold" htmlFor="response-panel-assigned-region">
            Region
            <SmsRegionSelect id="response-panel-assigned-region" value={assignedRegion} onChange={onAssignedRegionChange} />
          </label>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 px-4"
          onClick={() => onRunAction({ type: "assign", unit: assignedUnit, region: assignedRegion, confirmed: true }, "Routing updated.")}
        >
          Save assignment
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

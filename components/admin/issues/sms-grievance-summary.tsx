"use client";

import { Button } from "@/components/ui/button";
import { SMS_CASE_STATUS_LABELS, smsStatusLabel } from "@/lib/sms-grievance/queue";
import type { SmsCaseStatus, SmsMockScenario } from "@/types/sms-grievance.types";

function deliveryLabel(value: SmsMockScenario["deliveryStatus"]) {
  return {
    not_requested: "No reply sent",
    simulated_pending: "Reply pending",
    simulated_delivered: "Reply sent",
    simulated_failed: "Reply failed",
  }[value];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

export function SmsGrievanceHeader({ record }: { record: SmsMockScenario }) {
  return (
    <div className="border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{record.externalMessageId}</p>
          <h2 id="selected-sms-title" className="mt-1 font-heading text-xl font-semibold">{smsStatusLabel(record)}</h2>
        </div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Source: SMS Grievance</span>
      </div>
    </div>
  );
}

// Just the message artifact itself — the thing a reviewer reads first. Reference
// fields (sender, category, region, etc.) live in SmsGrievanceMetadataCard instead,
// so this stays short and doesn't compete with it for the main column.
export function SmsGrievanceMessageCard({ record }: { record: SmsMockScenario }) {
  return (
    <div className="space-y-3">
      {record.urgentReview && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
          This message may describe immediate danger. Review it first. This channel does not notify emergency responders automatically.
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">Message exactly as received</h3>
        <p className="mt-2 whitespace-pre-wrap break-words border border-slate-300 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {record.originalText}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">This message stays unchanged. Staff notes are kept separately.</p>
      </div>
    </div>
  );
}

// A reference panel meant to sit in a sidebar beside the working area, not stacked
// above it — so checking a detail never means scrolling away from the decision.
export function SmsGrievanceMetadataCard({
  record,
  statusOptions = [],
  statusTarget = "",
  onStatusTargetChange,
  statusChangeReason = "",
  onStatusChangeReasonChange,
  onConfirmStatusChange,
}: {
  record: SmsMockScenario;
  statusOptions?: { value: SmsCaseStatus; label: string }[];
  statusTarget?: SmsCaseStatus | "";
  onStatusTargetChange?: (value: SmsCaseStatus | "") => void;
  statusChangeReason?: string;
  onStatusChangeReasonChange?: (value: string) => void;
  onConfirmStatusChange?: () => void;
}) {
  return (
    <div className="space-y-5 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Message details</h3>
        <dl className="space-y-3">
          <Detail label="Sender" value={record.contactNumber} />
          <Detail label="Received" value={new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(record.receivedAt))} />
          <Detail label="Category" value={record.categoryLabel} />
          <Detail label="Project" value={record.projectLabel} />
          <Detail label="Location mentioned" value={record.locationLabel} />
          <Detail label="Name preference" value={record.senderMode === "anonymous" ? "Anonymous" : "Name provided"} />
          <Detail label="Language" value={record.language} />
          <Detail label="Review team" value={record.assignedUnit ?? "Not assigned"} />
          <Detail label="Region" value={record.assignedRegion ?? "Not assigned"} />
          <Detail label="Message status" value={deliveryLabel(record.deliveryStatus)} />
        </dl>
      </div>

      {statusOptions.length > 0 && onStatusTargetChange && onStatusChangeReasonChange && onConfirmStatusChange && (
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="grievance-status-select">
            Grievance status
          </label>
          <select
            id="grievance-status-select"
            value={statusTarget}
            onChange={(event) => onStatusTargetChange(event.target.value as SmsCaseStatus)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value={record.status}>{SMS_CASE_STATUS_LABELS[record.status]} (current)</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {statusTarget && statusTarget !== record.status && (
            <div className="mt-2 space-y-2">
              <label className="sr-only" htmlFor="grievance-status-reason">Reason for this change</label>
              <input
                id="grievance-status-reason"
                value={statusChangeReason}
                onChange={(event) => onStatusChangeReasonChange(event.target.value)}
                placeholder="Reason for this status change"
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <Button type="button" variant="outline" className="min-h-11 w-full px-4" onClick={onConfirmStatusChange}>
                Update status
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{record.relevanceReason}</p>
      </div>
    </div>
  );
}

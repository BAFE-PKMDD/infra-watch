import { smsStatusLabel } from "@/lib/sms-grievance/queue";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

function deliveryLabel(value: SmsMockScenario["deliveryStatus"]) {
  return {
    not_requested: "No sample reply",
    simulated_pending: "Sample reply pending",
    simulated_delivered: "Sample reply recorded",
    simulated_failed: "Sample reply failed",
  }[value];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
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

// Renders only the body content (urgent warning, message text, metadata, review
// summary) — the caller owns the shared "space-y-6 p-4" wrapper so this stays a
// sibling of SmsPrototypeActions and SmsConversationTimeline in one scroll flow.
export function SmsGrievanceSummary({ record }: { record: SmsMockScenario }) {
  return (
    <>
      {record.urgentReview && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
          This sample may describe immediate danger. Review it first. This prototype does not notify emergency responders.
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">Message exactly as received</h3>
        <p className="mt-2 whitespace-pre-wrap break-words border border-slate-300 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {record.originalText}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">This sample message stays unchanged. Staff notes are kept separately.</p>
      </div>

      <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        <Detail label="Sender" value={record.maskedContact} />
        <Detail label="Received" value={new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(record.receivedAt))} />
        <Detail label="Category" value={record.categoryLabel} />
        <Detail label="Project" value={record.projectLabel} />
        <Detail label="Location mentioned" value={record.locationLabel} />
      </dl>

      <details>
        <summary className="min-h-11 cursor-pointer py-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          More details
        </summary>
        <dl className="mt-3 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Detail label="Name preference" value={record.senderMode === "anonymous" ? "Anonymous" : "Name provided"} />
          <Detail label="Language" value={record.language} />
          <Detail label="Review team" value={record.assignedUnit ?? "Not assigned"} />
          <Detail label="Region" value={record.assignedRegion ?? "Not assigned"} />
          <Detail label="Message status" value={deliveryLabel(record.deliveryStatus)} />
        </dl>
      </details>

      <div>
        <h3 className="text-sm font-bold">Review summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{record.relevanceReason}</p>
      </div>
    </>
  );
}

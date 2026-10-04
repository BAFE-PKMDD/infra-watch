"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, RotateCcw, Send } from "lucide-react";

import { SmsPrototypeBanner } from "@/components/admin/issues/sms-prototype-banner";
import { SmsGrievanceMap } from "@/components/admin/issues/sms-grievance-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { sendSimulatedAcknowledgmentSms } from "@/actions/mutation/sms-grievance.mutation";
import { clearSmsPrototypeRecords, readSmsPrototypeRecords, writeSmsPrototypeRecords } from "@/lib/sms-grievance/mock-store";
import { applySmsPrototypeAction } from "@/lib/sms-grievance/prototype-state";
import { QUEUE_FILTERS, filterSmsReviewRecords, smsStatusLabel } from "@/lib/sms-grievance/queue";
import type { QueueFilter } from "@/lib/sms-grievance/queue";
import { createSimulatedIncomingMessage } from "@/lib/sms-grievance/simulate-incoming";
import { cn } from "@/lib/utils";
import type { SmsMockScenario } from "@/types/sms-grievance.types";
import { TutorialModeNotice } from "@/components/admin/tour/tutorial-sandbox";

const receivedDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// A message linked as a duplicate never reaches this table (filterSmsReviewRecords
// excludes it from every queue view), so there's no style branch for it here.
function statusClass(item: SmsMockScenario) {
  if (item.status === "needs_relevance_review") return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  if (item.relevance === "out_of_scope" || item.projectMatch === "not_bafe_project") return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (item.status === "resolved") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (item.status === "closed") return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
}

function StatusBadge({ item }: { item: SmsMockScenario }) {
  return (
    <Badge variant="outline" className={cn("h-auto rounded-md px-2.5 py-1 text-xs font-medium", statusClass(item))}>
      {smsStatusLabel(item)}
    </Badge>
  );
}

function MessageFlags({ item }: { item: SmsMockScenario }) {
  if (!item.urgentReview && !item.sensitive) return null;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
      {item.urgentReview && <span className="text-red-700 dark:text-red-300">Urgent review</span>}
      {item.sensitive && <span className="text-orange-800 dark:text-orange-200">Limited access</span>}
    </span>
  );
}

function MessageIdentity({ item }: { item: SmsMockScenario }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant="outline" className="h-auto rounded-md border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        {item.categoryLabel}
      </Badge>
      <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">{item.externalMessageId}</span>
      <MessageFlags item={item} />
    </div>
  );
}

// The project a message is tagged to is one of the first things staff need to scan for —
// shown with real weight instead of small gray text easy to miss next to the contact number.
function ProjectLabel({ value }: { value: string }) {
  return (
    <p className="min-w-0 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-200">{value}</p>
  );
}

function ContactNumber({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300" aria-label={`Sender number ${value}`}>
      {value}
    </span>
  );
}

// Lets staff test the whole intake-to-close flow against a real phone number of their own
// choosing, without that number ever touching a git-tracked file — the record this creates
// lives only in this browser's local storage, same as any other local review decision (see
// lib/sms-grievance/mock-store.ts and simulate-incoming.ts).
function SimulateIncomingForm({ onSubmit }: { onSubmit: (input: { contactNumber: string; originalText: string; locationLabel: string }) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11 w-full px-4 font-medium sm:w-auto" onClick={() => setOpen(true)}>
        <Send aria-hidden="true" className="size-4" /> Simulate incoming message
      </Button>
    );
  }

  return (
    <form
      className="w-full space-y-3 border border-slate-200 bg-slate-50 p-4 sm:w-auto sm:min-w-[360px] dark:border-slate-800 dark:bg-slate-950"
      onSubmit={async (event) => {
        event.preventDefault();
        setSending(true);
        const failure = await onSubmit({ contactNumber, originalText, locationLabel });
        setSending(false);
        if (failure) {
          setError(failure);
          return;
        }
        setContactNumber("");
        setOriginalText("");
        setLocationLabel("");
        setError("");
        setOpen(false);
      }}
    >
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
        Use a number you own — the acknowledgment sends as a real SMS to it. Everything else stays simulated.
      </p>
      <div>
        <Label htmlFor="simulate-contact-number">Phone number</Label>
        <Input
          id="simulate-contact-number"
          value={contactNumber}
          onChange={(event) => setContactNumber(event.target.value)}
          placeholder="09XXXXXXXXX"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="simulate-message-text">Message text</Label>
        <Textarea
          id="simulate-message-text"
          value={originalText}
          onChange={(event) => setOriginalText(event.target.value)}
          placeholder="Type the message as if it were sent from that phone."
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="simulate-location">Location (optional)</Label>
        <Input
          id="simulate-location"
          value={locationLabel}
          onChange={(event) => setLocationLabel(event.target.value)}
          placeholder="Barangay, municipality, province"
          className="mt-1"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-700 dark:text-red-300" role="alert">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={sending} className="min-h-11 flex-1 font-medium">{sending ? "Sending…" : "Send simulated message"}</Button>
        <Button type="button" variant="outline" disabled={sending} className="min-h-11 flex-1 font-medium" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function SmsGrievanceTable({
  initialRecords,
  dataSource = "sample",
  liveFetchError = false,
  tutorial = false,
}: {
  initialRecords: SmsMockScenario[];
  dataSource?: "live" | "sample";
  liveFetchError?: boolean;
  tutorial?: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [simulateFeedback, setSimulateFeedback] = useState("");

  useEffect(() => {
    if (tutorial) return;
    const timeout = window.setTimeout(() => setRecords(readSmsPrototypeRecords(window.localStorage, initialRecords)), 0);
    return () => window.clearTimeout(timeout);
  }, [initialRecords, tutorial]);

  const filtered = filterSmsReviewRecords(records, filter);

  const handleSimulateIncoming = async (input: { contactNumber: string; originalText: string; locationLabel: string }) => {
    if (tutorial) return "Incoming SMS simulation is unavailable during this guide.";
    try {
      const created = createSimulatedIncomingMessage(input, records);
      const ackItem = created.conversation.find((item) => item.kind === "outbound_sms");
      const sendResult = ackItem ? await sendSimulatedAcknowledgmentSms(created.contactNumber, ackItem.body) : { success: false, error: "No acknowledgment was generated." };
      const deliveryStatus = sendResult.success ? "sent" as const : "send_failed" as const;
      const finalRecord: SmsMockScenario = {
        ...created,
        deliveryStatus,
        conversation: created.conversation.map((item) => item.id === ackItem?.id ? { ...item, deliveryStatus } : item),
      };

      const updated = [finalRecord, ...records];
      setRecords(updated);
      writeSmsPrototypeRecords(window.localStorage, updated);
      setSimulateFeedback(sendResult.success
        ? `Simulated message ${finalRecord.externalMessageId} received from ${finalRecord.contactNumber}. A real acknowledgment SMS was sent to that number.`
        : `Simulated message ${finalRecord.externalMessageId} received, but the real acknowledgment SMS failed to send: ${sendResult.error ?? "unknown error"}.`);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "That message could not be simulated.";
    }
  };

  // A fast dismissal for the obvious cases (spam, wrong-number texts, unrelated
  // inquiries) without opening the full "Review & tag" wizard — the same outcome as
  // walking through it and choosing "Not a BAFE project" / "Not related to InfraWatch",
  // just without the extra clicks for something that doesn't need a closer look.
  const handleQuickNotInfraWatch = (item: SmsMockScenario) => {
    if (tutorial) return;
    try {
      const updated = applySmsPrototypeAction(item, {
        type: "mark_not_bafe_project",
        reason: "This message does not appear to be related to any BAFE project or program.",
        category: "not_related_to_infrawatch",
      });
      const nextRecords = records.map((record) => (record.id === updated.id ? updated : record));
      setRecords(nextRecords);
      writeSmsPrototypeRecords(window.localStorage, nextRecords);
      setSimulateFeedback(`${updated.externalMessageId} marked as not related to InfraWatch.`);
    } catch (error) {
      setSimulateFeedback(error instanceof Error ? error.message : "That message could not be tagged.");
    }
  };

  return (
    <div className="space-y-6">
      {tutorial ? <TutorialModeNotice /> : <SmsPrototypeBanner dataSource={dataSource} liveFetchError={liveFetchError} />}

      <section aria-labelledby="sms-queue-heading" className="border border-slate-200 bg-white px-4 py-5 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 id="sms-queue-heading" className="font-heading text-lg font-semibold text-slate-950 dark:text-white">Messages to check</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Choose a queue, read the message, then open it to confirm the project and routing.</p>
          </div>
          {!tutorial && <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-start">
            <SimulateIncomingForm onSubmit={handleSimulateIncoming} />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full px-4 font-medium sm:w-auto"
              onClick={() => {
                if (tutorial) return;
                clearSmsPrototypeRecords(window.localStorage);
                setRecords(initialRecords);
                setFilter("all");
                setSimulateFeedback("");
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" /> {dataSource === "live" ? "Restore original messages" : "Restore sample messages"}
            </Button>
          </div>}
        </div>

        {simulateFeedback && (
          <p className="mt-3 border-t border-slate-200 pt-3 text-sm font-semibold text-emerald-700 dark:border-slate-800 dark:text-emerald-400" aria-live="polite">
            {simulateFeedback}
          </p>
        )}

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex gap-2 overflow-x-auto pb-2" aria-label="SMS review queue filters" tabIndex={0}>
            {QUEUE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={cn(
                  "min-h-11 shrink-0 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  filter === option.value
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300" aria-live="polite">
            Showing {filtered.length} of {records.length} messages
          </p>
        </div>
      </section>

      <SmsGrievanceMap records={filtered} />

      {filtered.length === 0 ? (
        <section role="status" className="border border-slate-200 bg-white px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-heading text-base font-semibold text-slate-900 dark:text-white">No messages in this queue</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose another filter to continue reviewing messages.</p>
        </section>
      ) : (
        <>
          <section aria-label="SMS grievance messages" className="border border-slate-200 bg-white xl:hidden dark:border-slate-800 dark:bg-slate-900">
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((item) => (
                <li key={item.id} data-tour="sms-row" data-tour-record-id={item.id} className="p-4 sm:p-5">
                  <article className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <MessageIdentity item={item} />
                      <StatusBadge item={item} />
                    </div>

                    <p className="line-clamp-3 text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">{item.originalText}</p>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Location</dt>
                        <dd className="mt-0.5 leading-5 text-slate-800 dark:text-slate-200">{item.locationLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Matched project</dt>
                        <dd className="mt-0.5 leading-5 text-slate-800 dark:text-slate-200">{item.projectLabel}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <ContactNumber value={item.contactNumber} />
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">Received {receivedDateFormatter.format(new Date(item.receivedAt))}</span>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        {item.status === "needs_relevance_review" && (
                          <Button variant="outline" className="min-h-11 w-full font-medium sm:w-auto" onClick={() => handleQuickNotInfraWatch(item)}>
                            <Ban aria-hidden="true" className="size-4" /> Not InfraWatch
                          </Button>
                        )}
                        <Button asChild variant="outline" className="min-h-11 w-full font-medium sm:w-auto">
                          <Link data-tour="sms-open" href={`${tutorial ? "/learn/sms-grievances" : "/issues/sms-review"}/${item.id}`}>Review message</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>

          <section className="hidden overflow-hidden border border-slate-200 bg-white xl:block dark:border-slate-800 dark:bg-slate-900">
            <Table scrollRegionLabel="SMS grievance messages. Scroll horizontally within this table if needed.">
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-950">
                  <TableHead className="w-[42%] min-w-[400px] px-5 text-xs font-semibold text-slate-600 dark:text-slate-300">Message</TableHead>
                  <TableHead className="w-[22%] min-w-[200px] px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Location</TableHead>
                  <TableHead className="min-w-[155px] px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                  <TableHead className="min-w-[120px] px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Received</TableHead>
                  <TableHead className="min-w-[150px] px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} data-tour="sms-row" data-tour-record-id={item.id} className="align-top dark:border-slate-800">
                    <TableCell className="max-w-[520px] whitespace-normal px-5 py-5">
                      <div className="space-y-2">
                        <MessageIdentity item={item} />
                        <ProjectLabel value={item.projectLabel} />
                        <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">{item.originalText}</p>
                        <ContactNumber value={item.contactNumber} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal px-4 py-5 text-sm font-normal leading-6 text-slate-800 dark:text-slate-200">
                      {item.locationLabel}
                    </TableCell>
                    <TableCell className="px-4 py-5">
                      <StatusBadge item={item} />
                    </TableCell>
                    <TableCell className="px-4 py-5 text-sm font-normal tabular-nums text-slate-600 dark:text-slate-300">
                      {receivedDateFormatter.format(new Date(item.receivedAt))}
                    </TableCell>
                    <TableCell className="px-4 py-5">
                      <div className="flex flex-col gap-2">
                        {item.status === "needs_relevance_review" && (
                          <Button variant="outline" className="min-h-11 font-medium" onClick={() => handleQuickNotInfraWatch(item)}>
                            <Ban aria-hidden="true" className="size-4" /> Not InfraWatch
                          </Button>
                        )}
                        <Button asChild variant="outline" className="min-h-11 font-medium">
                          <Link data-tour="sms-open" href={`${tutorial ? "/learn/sms-grievances" : "/issues/sms-review"}/${item.id}`}>Review message</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { SmsPrototypeBanner } from "@/components/admin/issues/sms-prototype-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clearSmsPrototypeRecords, readSmsPrototypeRecords } from "@/lib/sms-grievance/mock-store";
import { QUEUE_FILTERS, filterSmsReviewRecords, smsStatusLabel } from "@/lib/sms-grievance/queue";
import type { QueueFilter } from "@/lib/sms-grievance/queue";
import { cn } from "@/lib/utils";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

const receivedDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function statusClass(item: SmsMockScenario) {
  if (item.status === "needs_relevance_review") return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  if (item.relevance === "out_of_scope" || item.projectMatch === "not_bafe_project") return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (item.relevance === "duplicate") return "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200";
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
      <span className="text-xs font-semibold text-primary">{item.categoryLabel}</span>
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">•</span>
      <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">{item.externalMessageId}</span>
      <MessageFlags item={item} />
    </div>
  );
}

function MaskedContact({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300" aria-label={`Masked sender number ${value}`}>
      {value}
    </span>
  );
}

export function SmsGrievanceTable({ initialRecords }: { initialRecords: SmsMockScenario[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [filter, setFilter] = useState<QueueFilter>("all");

  useEffect(() => {
    const timeout = window.setTimeout(() => setRecords(readSmsPrototypeRecords(window.localStorage, initialRecords)), 0);
    return () => window.clearTimeout(timeout);
  }, [initialRecords]);

  const filtered = filterSmsReviewRecords(records, filter);

  return (
    <div className="space-y-6">
      <SmsPrototypeBanner />

      <section aria-labelledby="sms-queue-heading" className="border border-slate-200 bg-white px-4 py-5 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 id="sms-queue-heading" className="font-heading text-lg font-semibold text-slate-950 dark:text-white">Messages to check</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Choose a queue, read the message, then open it to confirm the project and routing.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full px-4 font-medium sm:w-auto"
            onClick={() => {
              clearSmsPrototypeRecords(window.localStorage);
              setRecords(initialRecords);
              setFilter("all");
            }}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Restore sample messages
          </Button>
        </div>

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
                <li key={item.id} className="p-4 sm:p-5">
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
                        <MaskedContact value={item.maskedContact} />
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">Received {receivedDateFormatter.format(new Date(item.receivedAt))}</span>
                      </div>
                      <Button asChild variant="outline" className="min-h-11 w-full font-medium sm:w-auto">
                        <Link href={`/issues/sms-review/${item.id}`}>Review message</Link>
                      </Button>
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
                  <TableRow key={item.id} className="align-top dark:border-slate-800">
                    <TableCell className="max-w-[520px] whitespace-normal px-5 py-5">
                      <div className="space-y-2">
                        <MessageIdentity item={item} />
                        <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">{item.originalText}</p>
                        <div className="flex items-start gap-2">
                          <MaskedContact value={item.maskedContact} />
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">•</span>
                          <p className="min-w-0 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.projectLabel}</p>
                        </div>
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
                      <Button asChild variant="outline" className="min-h-11 font-medium">
                        <Link href={`/issues/sms-review/${item.id}`}>Review message</Link>
                      </Button>
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

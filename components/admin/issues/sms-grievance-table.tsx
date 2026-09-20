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

function statusClass(item: SmsMockScenario) {
  if (item.status === "needs_relevance_review") return "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (item.relevance === "out_of_scope" || item.projectMatch === "not_bafe_project") return "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  if (item.relevance === "duplicate") return "border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300";
  if (item.status === "resolved") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (item.status === "closed") return "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  return "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
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
    <div className="space-y-5">
      <SmsPrototypeBanner />

      <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Messages to check</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Read each sample message first, then decide whether it belongs in InfraWatch.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full px-4 lg:w-auto"
            onClick={() => {
              clearSmsPrototypeRecords(window.localStorage);
              setRecords(initialRecords);
              setFilter("all");
            }}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Restore sample messages
          </Button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="SMS review queue filters" tabIndex={0}>
          {QUEUE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                filter === option.value
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table scrollRegionLabel="SMS grievance sample messages. Use horizontal scrolling to view all columns.">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-950">
              <TableHead className="min-w-[380px] px-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Message</TableHead>
              <TableHead className="min-w-[180px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Location</TableHead>
              <TableHead className="min-w-[150px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Status</TableHead>
              <TableHead className="min-w-[110px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Received</TableHead>
              <TableHead className="min-w-[110px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-36 text-center text-sm font-bold text-slate-500">
                  No sample messages match this view. Choose another filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="dark:border-slate-800">
                  <TableCell className="max-w-[480px] whitespace-normal px-4 py-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-primary">{item.categoryLabel}</span>
                        <span className="text-xs font-semibold text-slate-400">{item.id}</span>
                        {item.urgentReview && <span className="text-xs font-bold text-red-700 dark:text-red-300">Urgent</span>}
                        {item.sensitive && <span className="text-xs font-bold text-orange-800 dark:text-orange-200">Limited access</span>}
                      </div>
                      <p className="line-clamp-2 text-sm font-extrabold leading-6 text-slate-950 dark:text-white">{item.originalText}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.maskedContact} · {item.projectLabel}</p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal py-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {item.locationLabel}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={cn("h-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase", statusClass(item))}>
                      {smsStatusLabel(item)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.receivedAt))}
                  </TableCell>
                  <TableCell className="py-4">
                    <Button asChild variant="outline" className="min-h-11">
                      <Link href={`/issues/sms-review/${item.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

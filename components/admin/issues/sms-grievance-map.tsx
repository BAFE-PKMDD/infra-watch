"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getLocatedSmsRecords } from "@/lib/sms-grievance/location";
import { smsStatusLabel } from "@/lib/sms-grievance/queue";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

const MapCanvas = dynamic(() => import("./sms-grievance-map-canvas"), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-96 items-center justify-center bg-slate-50 p-5 text-sm text-slate-600 sm:h-[28rem] dark:bg-slate-950 dark:text-slate-300">
      Loading message locations…
    </div>
  ),
});

export function SmsGrievanceMap({ records, singleMessage = false }: {
  records: SmsMockScenario[];
  singleMessage?: boolean;
}) {
  const headingId = useId();
  const selectId = useId();
  const located = useMemo(() => getLocatedSmsRecords(records), [records]);
  const [selectedId, setSelectedId] = useState("");
  const [fitRequest, setFitRequest] = useState(0);
  const selected = located.find((record) => record.id === selectedId)
    ?? (located.length === 1 ? located[0] : null);
  const unmappedCount = records.length - located.length;

  return (
    <section aria-labelledby={headingId} className="min-w-0 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id={headingId} className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
              {singleMessage ? "Approximate message location" : "Approximate message locations"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              One pin per SMS. Accuracy is unknown; confirm the location during review.
            </p>
          </div>
          {!singleMessage && (
            <p role="status" className="shrink-0 text-sm text-slate-600 sm:text-right dark:text-slate-300">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{located.length} of {records.length}</span> messages mapped
              {unmappedCount > 0 && <span className="block">{unmappedCount} without usable coordinates</span>}
            </p>
          )}
        </div>
        {!singleMessage && located.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
            <div className="w-full sm:max-w-sm">
              <label htmlFor={selectId} className="text-sm font-medium text-slate-800 dark:text-slate-200">Locate a message</label>
              <select
                id={selectId}
                value={selected?.id ?? ""}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  if (!event.target.value) setFitRequest((value) => value + 1);
                }}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">All message locations</option>
                {located.map((record) => <option key={record.id} value={record.id}>{record.externalMessageId} · {smsStatusLabel(record)}</option>)}
              </select>
            </div>
            <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => {
              setSelectedId("");
              setFitRequest((value) => value + 1);
            }}>
              Show all locations
            </Button>
          </div>
        )}
      </div>

      {located.length === 0 ? (
        <div role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-8 sm:px-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">No coordinates available to map</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {records.length === 0
              ? "Choose another queue to see message locations."
              : "Review the location mentioned in the message. A place name alone is not plotted on this map."}
          </p>
        </div>
      ) : (
        <>
          <MapCanvas records={located} selectedId={selected?.id ?? null} onSelect={setSelectedId} fitRequest={fitRequest} singleMessage={singleMessage} />
          <div className="border-t border-slate-200 px-4 py-3 sm:px-5 dark:border-slate-800">
            <div aria-live="polite">
              {selected ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1 text-sm">
                    {!singleMessage && <p className="font-semibold text-slate-900 dark:text-white">{selected.externalMessageId} · {smsStatusLabel(selected)}</p>}
                    {!singleMessage && <p className="line-clamp-2 break-words leading-6 text-slate-700 dark:text-slate-200">{selected.originalText}</p>}
                    <p className="tabular-nums text-slate-600 dark:text-slate-300">
                      Approximate coordinates: {selected.coordinates.lat.toFixed(5)}, {selected.coordinates.lng.toFixed(5)}
                    </p>
                  </div>
                  {!singleMessage && <Button asChild variant="outline" className="min-h-11 shrink-0">
                    <Link href={`/issues/sms-review/${encodeURIComponent(selected.id)}`}>Review message</Link>
                  </Button>}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Select a pin to read its message. For overlapping pins, use the message selector above.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { subDays } from "date-fns";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

export function ReportDateFilter({ initialRange }: { initialRange?: { from: Date; to: Date } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>({
    from: initialRange?.from || subDays(new Date(), 30),
    to: initialRange?.to || new Date(),
  });

  function applyFilter(range: DateRange | undefined) {
    if (!range?.from || !range?.to) return;
    const params = new URLSearchParams(searchParams);
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    router.push(`?${params.toString()}`);
  }

  function handleDateChange(next: DateRange | undefined) {
    setDate(next);
    if (next?.from && next?.to) applyFilter(next);
  }

  function resetFilter() {
    const defaultRange = { from: subDays(new Date(), 30), to: new Date() };
    setDate(defaultRange);
    applyFilter(defaultRange);
  }

  return (
    <div data-tour="report-dates" className="flex flex-wrap items-center gap-2">
      <div className="mr-2 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        Period:
      </div>

      <DateRangePicker value={date} onChange={handleDateChange} />

      <Button variant="ghost" size="sm" onClick={resetFilter} className="min-h-11 gap-2 px-3 text-slate-500 hover:text-slate-950 dark:hover:text-white">
        <FilterX className="h-4 w-4" aria-hidden="true" />
        Clear
      </Button>

      <div className="ml-auto flex gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => {
              const range = { from: subDays(new Date(), preset.days), to: new Date() };
              setDate(range);
              applyFilter(range);
            }}
            className="h-8 border-slate-200 text-[10px] font-bold dark:border-slate-800"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getReportPreset, parseReportRange, reportRangeToCalendar } from "@/lib/reports/date-range";

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

export function ReportDateFilter({ initialRange }: { initialRange?: { from: Date; to: Date } }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? initialRange?.from;
  const to = searchParams.get("to") ?? initialRange?.to;
  let range;
  try {
    range = parseReportRange({ from, to });
  } catch {
    range = parseReportRange();
  }
  return <ReportDateFilterControls key={`${range.from}:${range.to}`} initialRange={reportRangeToCalendar(range)} />;
}

function ReportDateFilterControls({ initialRange }: { initialRange: DateRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>(initialRange);

  function applyFilter(range: DateRange | undefined) {
    if (!range?.from || !range?.to) return;
    const params = new URLSearchParams(searchParams);
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(range.to, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`);
  }

  function handleDateChange(next: DateRange | undefined) {
    if (!next) {
      resetFilter();
      return;
    }
    setDate(next);
    if (next?.from && next?.to) applyFilter(next);
  }

  function resetFilter() {
    const defaultRange = reportRangeToCalendar(getReportPreset(30));
    setDate(defaultRange);
    applyFilter(defaultRange);
  }

  return (
    <div data-tour="report-dates" className="flex flex-wrap items-center gap-2">
      <div className="mr-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        Period:
      </div>

      <DateRangePicker value={date} onChange={handleDateChange} />

      <Button variant="ghost" size="sm" onClick={resetFilter} className="min-h-11 gap-2 px-3 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
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
              const range = reportRangeToCalendar(getReportPreset(preset.days));
              setDate(range);
              applyFilter(range);
            }}
            className="min-h-11 min-w-11 border-slate-200 text-sm font-semibold dark:border-slate-800"
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="w-full text-xs text-slate-600 dark:text-slate-300">Inclusive calendar dates · Asia/Manila</p>
    </div>
  );
}

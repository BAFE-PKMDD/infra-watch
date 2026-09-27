"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { FACILITY_CATEGORIES } from "@/lib/public-analytics/rules";
import type { PublicFilters } from "@/lib/public-analytics/aggregate";

import { usePublicAnalyticsStrings } from "./use-strings";

type Options = { regions: string[]; provinces: string[]; municipalities: string[]; years: number[] };

const FIELD_ORDER = ["region", "province", "municipality", "year", "category"] as const;
type Field = (typeof FIELD_ORDER)[number];
// Changing a place clears the smaller places inside it.
const CLEARS: Partial<Record<Field, Field[]>> = { region: ["province", "municipality"], province: ["municipality"] };

export function FiltersBar({ filters, options }: { filters: PublicFilters; options: Options }) {
  const t = usePublicAnalyticsStrings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (field: Field, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(field, value);
    else params.delete(field);
    for (const cleared of CLEARS[field] ?? []) params.delete(cleared);
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const active = FIELD_ORDER.some((field) => filters[field]);

  const selectClass =
    "min-h-11 w-full rounded-md border border-pa-axis bg-pa-surface-2 px-3 text-base text-pa-ink disabled:opacity-60";

  const fields: Array<{ field: Field; label: string; value: string; choices: Array<{ value: string; label: string }>; disabled?: boolean }> = [
    { field: "region", label: t.filters.region, value: filters.region ?? "", choices: options.regions.map((value) => ({ value, label: value })) },
    { field: "province", label: t.filters.province, value: filters.province ?? "", choices: options.provinces.map((value) => ({ value, label: value })) },
    { field: "municipality", label: t.filters.municipality, value: filters.municipality ?? "", choices: options.municipalities.map((value) => ({ value, label: value })), disabled: !filters.province && !filters.region },
    { field: "year", label: t.filters.year, value: filters.year ? String(filters.year) : "", choices: options.years.map((value) => ({ value: String(value), label: String(value) })) },
    { field: "category", label: t.filters.category, value: filters.category ?? "", choices: FACILITY_CATEGORIES.map((value) => ({ value, label: t.categories[value] })) },
  ];

  return (
    <form
      aria-label={t.filters.label}
      aria-busy={isPending}
      onSubmit={(event) => event.preventDefault()}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end"
    >
      {fields.map(({ field, label, value, choices, disabled }) => (
        <label key={field} className="flex min-w-0 flex-col gap-1 text-sm font-medium text-pa-ink-2">
          {label}
          <select className={selectClass} value={value} disabled={disabled} onChange={(event) => update(field, event.target.value)}>
            <option value="">{t.filters.all}</option>
            {value && !choices.some((choice) => choice.value === value) ? <option value={value}>{value}</option> : null}
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </label>
      ))}
      {active ? (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="min-h-11 rounded-md px-3 text-base font-medium text-pa-accent underline-offset-4 hover:underline"
        >
          {t.page.clearFilters}
        </button>
      ) : null}
    </form>
  );
}

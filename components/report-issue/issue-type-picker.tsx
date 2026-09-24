"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatIssueTypeValue,
  parseIssueTypeValue,
  splitIssueTypesByFarmOperation,
  type IssueTypeOption,
} from "@/lib/abemis/issue-type-map";

interface IssueTypePickerProps {
  value: string;
  farmOperation: string;
  onChange: (value: string) => void;
}

export function IssueTypePicker({ value, farmOperation, onChange }: IssueTypePickerProps) {
  const selected = parseIssueTypeValue(value);
  const { recommended, more } = splitIssueTypesByFarmOperation(farmOperation);

  const toggle = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter((selectedLabel) => selectedLabel !== label)
      : [...selected, label];
    onChange(formatIssueTypeValue(next));
  };

  const hasSelectionOnlyInMore = selected.some(
    (label) => !recommended.some((type) => type.label === label),
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Issue Type <span className="text-red-500 dark:text-red-400">*</span>
      </Label>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Select all that apply &middot; {farmOperation ? `Common for ${farmOperation}` : "Common issue types"}
      </p>

      <div
        role="group"
        aria-label="Issue type"
        data-testid="recommended-issue-types"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {recommended.map((type) => (
          <IssueTypeCard
            key={type.id}
            type={type}
            isSelected={selected.includes(type.label)}
            onToggle={() => toggle(type.label)}
          />
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {selected.length} selected: {selected.join(", ")}
        </p>
      )}

      {more.length > 0 && (
        <details className="group" open={hasSelectionOnlyInMore}>
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
              &rsaquo;
            </span>
            Browse all issue types
          </summary>
          <div data-testid="more-issue-types" className="mt-2 flex flex-wrap gap-2">
            {more.map((type) => (
              <IssueTypeChip
                key={type.id}
                type={type}
                isSelected={selected.includes(type.label)}
                onToggle={() => toggle(type.label)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function IssueTypeCard({
  type,
  isSelected,
  onToggle,
}: {
  type: IssueTypeOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const Icon = type.icon;
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
        isSelected
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-700",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{type.label}</span>
    </button>
  );
}

function IssueTypeChip({
  type,
  isSelected,
  onToggle,
}: {
  type: IssueTypeOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const Icon = type.icon;
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
        isSelected
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-700",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{type.label}</span>
    </button>
  );
}

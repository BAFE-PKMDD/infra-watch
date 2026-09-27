"use client";

import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  ISSUE_TYPES,
  formatIssueTypeValue,
  getCategoryDisplayName,
  parseIssueTypeValue,
  splitIssueTypes,
  type IssueTypeOption,
  type ReportCategory,
} from "@/lib/abemis/issue-type-map";

export type Translate = (path: string, variables?: Record<string, string | number>) => string;

const REPORT_CATEGORIES: ReportCategory[] = ["quality", "progress", "general", "concerns"];

/**
 * Display text for one issue type. The English label stays the stored value (see
 * issue-type-map.ts); only what the visitor reads follows the EN/TL switch. A label that is
 * not in the catalog (older free-text data) is shown as stored.
 */
export function issueTypeText(label: string, t: Translate): string {
  const type = ISSUE_TYPES.find((option) => option.label === label);
  return type ? t(`eReport.issueTypes.${type.id}`) : label;
}

/** Display text for a stored issue-type value, which may hold several labels joined by " | ". */
export function issueTypeValueText(value: string, t: Translate, separator = " | "): string {
  const labels = parseIssueTypeValue(value);
  return labels.length > 0 ? labels.map((label) => issueTypeText(label, t)).join(separator) : value;
}

/** Display text for a report category stored either as its id ("quality") or its English name. */
export function categoryText(value: string | null | undefined, t: Translate): string {
  if (!value) return "";
  const id = REPORT_CATEGORIES.find((category) => category === value || getCategoryDisplayName(category) === value);
  return id ? t(`eReport.categories.${id}.label`) : value;
}

interface IssueTypePickerProps {
  value: string;
  category?: string;
  farmOperation?: string;
  onChange: (value: string) => void;
  /** Whether to show the required-field marker. Defaults to true for e-report; pass
   * false where the picker is an optional add-on, e.g. within feedback. */
  required?: boolean;
}

export function IssueTypePicker({
  value,
  category,
  farmOperation = "",
  onChange,
  required = true,
}: IssueTypePickerProps) {
  const selected = parseIssueTypeValue(value);
  const { t } = useTranslation();
  const { recommended, more } = splitIssueTypes({ category, farmOperation });

  const toggle = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter((selectedLabel) => selectedLabel !== label)
      : [...selected, label];
    onChange(formatIssueTypeValue(next));
  };

  const hasSelectionOnlyInMore = selected.some(
    (label) => !recommended.some((type) => type.label === label),
  );

  const categoryLabel = categoryText(category, t);
  const eyebrow = categoryLabel
    ? t("eReport.picker.commonFor", { name: categoryLabel })
    : farmOperation
      ? t("eReport.picker.commonFor", { name: farmOperation })
      : t("eReport.picker.commonTypes");

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {t("eReport.picker.label")} {required
          ? <span className="text-red-500 dark:text-red-400">*</span>
          : <span className="font-normal text-slate-400 dark:text-slate-500">{t("eReport.picker.optional")}</span>}
      </Label>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {t("eReport.picker.selectAll")} &middot; {eyebrow}
      </p>

      <div
        role="group"
        aria-label={t("eReport.picker.groupLabel")}
        data-testid="recommended-issue-types"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {recommended.map((type) => (
          <IssueTypeCard
            key={type.id}
            type={type}
            text={issueTypeText(type.label, t)}
            isSelected={selected.includes(type.label)}
            onToggle={() => toggle(type.label)}
          />
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {t("eReport.picker.selectedSummary", {
            count: selected.length,
            labels: selected.map((label) => issueTypeText(label, t)).join(", "),
          })}
        </p>
      )}

      {more.length > 0 && (
        <details className="group" open={hasSelectionOnlyInMore}>
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
              &rsaquo;
            </span>
            {t("eReport.picker.browseAll")}
          </summary>
          <div data-testid="more-issue-types" className="mt-2 flex flex-wrap gap-2">
            {more.map((type) => (
              <IssueTypeChip
                key={type.id}
                type={type}
                text={issueTypeText(type.label, t)}
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
  text,
  isSelected,
  onToggle,
}: {
  type: IssueTypeOption;
  text: string;
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
      <span>{text}</span>
    </button>
  );
}

function IssueTypeChip({
  type,
  text,
  isSelected,
  onToggle,
}: {
  type: IssueTypeOption;
  text: string;
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
      <span>{text}</span>
    </button>
  );
}

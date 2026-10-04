import { ISSUE_TYPES } from "@/lib/abemis/issue-type-map";
import type { SmsCategory } from "@/types/sms-grievance.types";

export type SmsCategoryOption = { value: SmsCategory; label: string };

// A handful of report types that only make sense for an anonymous SMS line, not the
// identified E-Report/Feedback forms that otherwise share this same ISSUE_TYPES catalog —
// someone reporting solicited bribery or a payment dispute rarely does so through a form
// tied to their own account.
const SMS_ONLY_CATEGORIES: SmsCategoryOption[] = [
  { value: "misconduct_corruption", label: "Misconduct, improper request, or suspected corruption" },
  { value: "budget_procurement_payment", label: "Budget, procurement, supplier, or payment concern" },
  { value: "incorrect_project_information", label: "Incorrect or missing project information" },
];

// The same issue-type catalog E-Report and Feedback use (lib/abemis/issue-type-map.ts),
// so a staff member tagging an SMS grievance picks from the same specific list a citizen
// would've picked from on those forms — including equipment/machinery-specific types that
// the SMS line's own older, built-infrastructure-only category list didn't have.
export const SMS_CATEGORY_OPTIONS: SmsCategoryOption[] = [
  ...ISSUE_TYPES.map((type) => ({ value: type.id, label: type.label })),
  ...SMS_ONLY_CATEGORIES,
];

const SMS_CATEGORY_LABEL_BY_VALUE = new Map(SMS_CATEGORY_OPTIONS.map((option) => [option.value, option.label]));

export function getSmsCategoryLabel(category: SmsCategory | null): string {
  if (!category) return "Not yet classified";
  return SMS_CATEGORY_LABEL_BY_VALUE.get(category) ?? category;
}

// "other" matches ISSUE_TYPES' own catch-all id ("Other"), kept as the same fallback a
// citizen gets on the shared forms rather than inventing an SMS-only default.
export const DEFAULT_SMS_CATEGORY: SmsCategory = "other";

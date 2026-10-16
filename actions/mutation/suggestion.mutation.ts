"use server";

import { createContactMessage } from "@/actions/mutation/contact.mutation";
import { suggestionInputSchema, toSuggestionContactMessage, type SuggestionField, type SuggestionInput } from "@/lib/suggestions";

export async function createSuggestion(data: SuggestionInput) {
  const parsed = suggestionInputSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SuggestionField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && field !== "website" && field in suggestionInputSchema.shape) {
        fieldErrors[field as SuggestionField] ??= issue.message;
      }
    }
    return { success: false, message: "Check the highlighted fields and try again.", fieldErrors };
  }

  return createContactMessage(toSuggestionContactMessage(parsed.data));
}

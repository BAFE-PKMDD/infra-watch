import { z } from "zod";

export const SUGGESTION_CATEGORIES = ["suggestion", "website_problem", "general_comment"] as const;

export const suggestionInputSchema = z.object({
  category: z.enum(SUGGESTION_CATEGORIES),
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  subject: z.string().trim().min(1, "Subject is required").max(160, "Subject must be 160 characters or fewer"),
  message: z.string().trim().min(10, "Please provide at least 10 characters").max(5000, "Message must be 5,000 characters or fewer"),
  website: z.string().optional(),
});

export type SuggestionInput = z.input<typeof suggestionInputSchema>;
export type SuggestionField = keyof Omit<SuggestionInput, "website">;

const INBOX_PREFIXES = {
  suggestion: "System suggestion",
  website_problem: "Website problem",
  general_comment: "System comment",
} as const;

export function toSuggestionContactMessage(input: z.output<typeof suggestionInputSchema>) {
  const { category, ...message } = input;
  return { ...message, subject: `[${INBOX_PREFIXES[category]}] ${message.subject}` };
}

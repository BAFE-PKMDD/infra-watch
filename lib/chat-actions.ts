import { z } from "zod";

/**
 * Fixed allowlist of navigation targets ARIA/ANIA may suggest as action buttons.
 * The model only ever picks a key from this list - it never supplies its own
 * label or href, so a manipulated tool result or prompt-injected project field
 * can't turn a chat answer into an open redirect or a spoofed call to action.
 */
export const CHAT_ACTION_TARGETS = {
  report_issue: { label: "Report an Issue", href: "/report-issue/new" },
  give_feedback: { label: "Give Feedback", href: "/citizen-feed" },
  browse_projects: { label: "Browse Projects", href: "/projects" },
  view_faq: { label: "View FAQ", href: "/faq" },
  view_live: { label: "View Live Updates", href: "/live" },
  view_evidence_map: { label: "View Evidence Map", href: "/evidence-map" },
} as const satisfies Record<string, { label: string; href: string }>;

export type ChatActionKey = keyof typeof CHAT_ACTION_TARGETS;

export interface ChatActionItem {
  key: ChatActionKey;
  label: string;
  href: string;
}

const actionKeys = Object.keys(CHAT_ACTION_TARGETS) as [ChatActionKey, ...ChatActionKey[]];

const actionSpecSchema = z.object({
  actions: z.array(z.enum(actionKeys)).min(1).max(3),
});

export interface ActionSpec {
  actions: ChatActionItem[];
}

export function parseActionSpec(source: string): ActionSpec | null {
  try {
    const parsed: unknown = JSON.parse(source.trim());
    const result = actionSpecSchema.safeParse(parsed);
    if (!result.success) return null;

    const seen = new Set<ChatActionKey>();
    const actions: ChatActionItem[] = [];
    for (const key of result.data.actions) {
      if (seen.has(key)) continue;
      seen.add(key);
      actions.push({ key, ...CHAT_ACTION_TARGETS[key] });
    }

    return actions.length > 0 ? { actions } : null;
  } catch {
    return null;
  }
}

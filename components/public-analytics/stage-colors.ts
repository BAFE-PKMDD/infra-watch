import type { PublicStageKey } from "@/lib/public-analytics/rules";

/** Fixed stage colors, shared by the map, legend, chips and stacked bar. */
export const STAGE_COLOR: Record<PublicStageKey, string> = {
  bidding: "var(--stage-bidding)",
  construction: "var(--stage-construction)",
  on_hold: "var(--stage-on-hold)",
  turnover: "var(--stage-turnover)",
  handed_over: "var(--stage-handed-over)",
};

/** Legend and stacked-bar order: from earliest to latest, with on hold last. */
export const STAGE_DISPLAY_ORDER: PublicStageKey[] = ["bidding", "construction", "turnover", "handed_over", "on_hold"];

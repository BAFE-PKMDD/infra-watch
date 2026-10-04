import { z } from "zod";
import { DETAIL_TOURS, FEATURE_TOURS, OVERVIEW_ID, TOUR_VERSION } from "./catalog";
import { TASK_TUTORIALS } from "./tutorials";
import { CITIZEN_TOUR_IDS } from "./citizen";

export type TourOutcome = "completed" | "skipped";
export type TourProgress = { automatic: boolean; seen: Record<string, TourOutcome> };
export const EMPTY_TOUR_PROGRESS: TourProgress = { automatic: true, seen: {} };
export const tourKey = (id: string) => `v${TOUR_VERSION}:${id}`;
const ids = new Set([OVERVIEW_ID, ...CITIZEN_TOUR_IDS, ...FEATURE_TOURS.map((tour) => tour.id), ...DETAIL_TOURS.map((tour) => tour.id), ...TASK_TUTORIALS.map((tour) => tour.id)]);

export const tourUpdateSchema = z.object({
  tourId: z.string().refine((id) => ids.has(id), "Unknown tour"),
  outcome: z.enum(["completed", "skipped"]),
  disableAutomatic: z.boolean(),
}).strict();
export type TourUpdate = z.infer<typeof tourUpdateSchema>;

export function applyTourUpdate(progress: TourProgress, update: TourUpdate): TourProgress {
  return {
    automatic: !update.disableAutomatic,
    seen: { ...progress.seen, [tourKey(update.tourId)]: progress.seen[tourKey(update.tourId)] === "completed" ? "completed" : update.outcome },
  };
}

export function automaticTourId(progress: TourProgress): string | null {
  if (!progress.automatic) return null;
  if (!progress.seen[tourKey(OVERVIEW_ID)]) return OVERVIEW_ID;
  return null;
}

"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userTourProgress } from "@/lib/db/schema";
import { requireAuth } from "@/lib/session";
import { availableTourIds } from "@/lib/tours/catalog";
import { availableTaskTutorials } from "@/lib/tours/tutorials";
import { CITIZEN_TOUR_IDS } from "@/lib/tours/citizen";
import { EMPTY_TOUR_PROGRESS, tourKey, tourUpdateSchema, type TourProgress } from "@/lib/tours/progress";

async function tourUser() {
  const user = await requireAuth();
  if (!["admin", "regional_admin", "moderator", "citizen"].includes(user.role ?? "")) throw new Error("Forbidden");
  return user;
}

export async function getTourProgress(): Promise<TourProgress> {
  const user = await tourUser();
  const [row] = await db.select({ automatic: userTourProgress.automatic, seen: userTourProgress.seen })
    .from(userTourProgress).where(eq(userTourProgress.userId, user.id)).limit(1);
  return row ?? EMPTY_TOUR_PROGRESS;
}

export async function saveTourProgress(input: unknown): Promise<void> {
  const user = await tourUser();
  const update = tourUpdateSchema.parse(input);
  const allowed = user.role === "citizen"
    ? CITIZEN_TOUR_IDS.includes(update.tourId)
    : availableTourIds(user).includes(update.tourId) || availableTaskTutorials(user).some((tutorial) => tutorial.id === update.tourId);
  if (!allowed) {
    throw new Error("Forbidden");
  }
  const seen = { [tourKey(update.tourId)]: update.outcome };
  // Merge only the changed tour so another tab cannot overwrite prior progress.
  await db.insert(userTourProgress).values({ userId: user.id, automatic: !update.disableAutomatic, seen })
    .onConflictDoUpdate({
      target: userTourProgress.userId,
      set: {
        seen: sql`case when ${userTourProgress.seen} ->> ${tourKey(update.tourId)} = 'completed' then ${userTourProgress.seen} else ${userTourProgress.seen} || ${JSON.stringify(seen)}::jsonb end`,
        automatic: !update.disableAutomatic,
        updatedAt: new Date(),
      },
    });
}

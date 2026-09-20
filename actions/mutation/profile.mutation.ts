"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { user } from "@/auth-schema";
import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";

const PH_MOBILE_LOCAL = /^09\d{9}$/;
const PH_MOBILE_INTL = /^\+639\d{9}$/;

function normalizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (PH_MOBILE_INTL.test(trimmed)) return trimmed;
  if (PH_MOBILE_LOCAL.test(trimmed)) return `+63${trimmed.slice(1)}`;
  return null;
}

export async function updateMyPhoneNumber(rawPhoneNumber: string | null) {
  const currentUser = await requireAuth();

  let phoneNumber: string | null = null;
  if (rawPhoneNumber && rawPhoneNumber.trim()) {
    phoneNumber = normalizePhoneNumber(rawPhoneNumber);
    if (!phoneNumber) {
      throw new Error("Enter a valid PH mobile number (e.g. 09171234567)");
    }
  }

  const [existing] = await db.select({ phoneNumber: user.phoneNumber }).from(user).where(eq(user.id, currentUser.id)).limit(1);

  await db.update(user).set({ phoneNumber, updatedAt: new Date() }).where(eq(user.id, currentUser.id));

  revalidatePath("/my-profile");

  await logAudit({
    tableName: "user",
    recordId: currentUser.id,
    action: "UPDATE",
    oldValues: { phoneNumber: existing?.phoneNumber ?? null },
    newValues: { phoneNumber },
    notes: phoneNumber ? "User updated their own phone number" : "User cleared their phone number",
    context: await getAuditContextFromServerAction(currentUser),
  });

  return { success: true, phoneNumber };
}

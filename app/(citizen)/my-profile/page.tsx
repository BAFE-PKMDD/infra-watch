import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { MyProfileClient } from "@/components/profile/my-profile-client";
import { getNotificationPreferences } from "@/lib/account-preferences";
import { db } from "@/lib/db";
import { account } from "@/auth-schema";
import { and, eq } from "drizzle-orm";

export default async function MyProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/my-profile")}`);
  }

  const user = session.user;
  const [preferences, credentials] = await Promise.all([
    getNotificationPreferences(user.id),
    db.select({ id: account.id }).from(account).where(and(eq(account.userId, user.id), eq(account.providerId, "credential"))).limit(1),
  ]);

  return (
    <MyProfileClient
      preferences={preferences}
      hasPassword={credentials.length > 0}
      user={{
        name: user.name ?? "",
        email: user.email,
        role: (user as { role?: string | null }).role ?? "citizen",
        phoneNumber: (user as { phoneNumber?: string | null }).phoneNumber ?? null,
      }}
    />
  );
}

import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { MyProfileClient } from "@/components/profile/my-profile-client";

export default async function MyProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/my-profile")}`);
  }

  const user = session.user;

  return (
    <MyProfileClient
      user={{
        name: user.name ?? "",
        email: user.email,
        role: (user as { role?: string | null }).role ?? "citizen",
        phoneNumber: (user as { phoneNumber?: string | null }).phoneNumber ?? null,
      }}
    />
  );
}

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
} & Record<string, unknown>;

export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

export const requireAuth = cache(async () => {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in.");
  }

  return session.user as SessionUser;
});

export const requireAdminOrModerator = cache(async () => {
  const user = await requireAuth();

  if (user.role !== "admin" && user.role !== "moderator") {
    throw new Error("Forbidden: Insufficient permissions.");
  }

  return user;
});

export const requireAdmin = cache(async () => {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Forbidden: Administrator privileges required.");
  }

  return user;
});

export async function isAuthenticated() {
  const session = await getSession();
  return Boolean(session?.user);
}

export async function hasRole(role: string | string[]) {
  const session = await getSession();
  if (!session?.user?.role) {
    return false;
  }

  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(session.user.role);
}

export async function canAccessAdmin() {
  return await hasRole(["admin", "moderator"]);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

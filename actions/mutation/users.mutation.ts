"use server";

import { db } from "@/lib/db";
import { user, session } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import { hasPermission, type statement } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { IMPLEMENTING_AGENCIES } from "@/constants/agencies";

type PermissionResource = keyof typeof statement;
type PermissionAction<R extends PermissionResource> = (typeof statement)[R][number];
type ManagedRole = "admin" | "moderator" | "citizen";
type UserUpdates = Partial<Pick<typeof user.$inferInsert, "name" | "email" | "image">>;

/**
 * Get current session and check if user has required permission
 */
async function checkPermission<R extends PermissionResource>(resource: R, action: PermissionAction<R>) {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!currentSession?.user) {
    throw new Error("Unauthorized: You must be logged in");
  }

  const userRole = currentSession.user.role;

  if (!hasPermission(userRole, resource, action)) {
    throw new Error("Forbidden: You don't have permission to perform this action");
  }

  return currentSession;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: ManagedRole;
}) {
  const currentSession = await checkPermission("user", "create");

  const { name, email, password, role = "citizen" } = data;

  try {
    const result = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role,
      },
    });

    if (!result || !result.user) {
      throw new Error("Failed to create user");
    }

    await db
      .update(user)
      .set({
        emailVerified: true,
      })
      .where(eq(user.id, result.user.id));

    revalidatePath("/user-management");

    await logAudit({
      tableName: "user",
      recordId: result.user.id,
      action: "CREATE",
      newValues: {
        id: result.user.id,
        email,
        name,
        role,
        emailVerified: true,
      },
      notes: "User created",
      context: await getAuditContextFromServerAction(currentSession.user),
    });

    return { success: true, userId: result.user.id };
  } catch (error) {
    console.error("Error creating user", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to create user");
  }
}

/**
 * Update user details
 */
export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    image?: string;
  }
) {
  const currentSession = await checkPermission("user", "update");

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  const updates: UserUpdates = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.image !== undefined) updates.image = data.image;

  if (Object.keys(updates).length === 0) {
    throw new Error("No fields to update");
  }

  await db
    .update(user)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: { ...existing, ...updates, updatedAt: new Date() },
    notes: "User profile updated",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: ManagedRole
) {
  const currentSession = await checkPermission("user", "set-role");

  if (currentSession?.user?.id === userId) {
    throw new Error("You cannot change your own role");
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  await auth.api.setRole({
    body: {
      userId,
      role,
    },
    headers: await headers(),
  });

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: { ...existing, role, updatedAt: new Date() },
    notes: `User role changed to ${role}`,
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Update user region (for moderator scope)
 */
export async function updateUserRegion(
  userId: string,
  region: string | null
) {
  const currentSession = await checkPermission("user", "update");

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  if (existing.role !== "moderator") {
    throw new Error("Region can only be set for moderators");
  }

  await db
    .update(user)
    .set({
      region,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: { ...existing, region, updatedAt: new Date() },
    notes: region ? `Moderator region set to ${region}` : "Moderator region cleared",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Update user assigned program (for moderator scope)
 */
export async function updateUserAgency(
  userId: string,
  agency: string | null
) {
  const currentSession = await checkPermission("user", "update");

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  if (existing.role !== "moderator") {
    throw new Error("Program scope can only be set for moderators");
  }

  if (agency && !IMPLEMENTING_AGENCIES.includes(agency as (typeof IMPLEMENTING_AGENCIES)[number])) {
    throw new Error(`Invalid program scope: ${agency}`);
  }

  await db
    .update(user)
    .set({
      assignedAgency: agency,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: { ...existing, assignedAgency: agency, updatedAt: new Date() },
    notes: agency ? `Moderator program scope set to ${agency}` : "Moderator program scope cleared",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Ban a user
 */
export async function banUser(
  userId: string,
  data: {
    reason: string;
    expiresAt?: Date;
  }
) {
  const currentSession = await checkPermission("user", "ban");

  if (currentSession?.user?.id === userId) {
    throw new Error("You cannot ban yourself");
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  let banExpiresIn: number | undefined;
  if (data.expiresAt) {
    banExpiresIn = Math.floor((data.expiresAt.getTime() - Date.now()) / 1000);
    if (banExpiresIn < 0) banExpiresIn = 0;
  }

  await auth.api.banUser({
    body: {
      userId,
      banReason: data.reason,
      banExpiresIn,
    },
    headers: await headers(),
  });

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: {
      ...existing,
      banned: true,
      banReason: data.reason,
      banExpires: data.expiresAt ?? null,
      updatedAt: new Date(),
    },
    notes: "User banned",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string) {
  const currentSession = await checkPermission("user", "ban");

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  await auth.api.unbanUser({
    body: {
      userId,
    },
    headers: await headers(),
  });

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: {
      ...existing,
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: new Date(),
    },
    notes: "User unbanned",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string) {
  const currentSession = await checkPermission("user", "delete");

  if (currentSession?.user?.id === userId) {
    throw new Error("You cannot delete yourself");
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  await auth.api.removeUser({
    body: {
      userId,
    },
    headers: await headers(),
  });

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "DELETE",
    oldValues: { ...existing },
    notes: "User deleted",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Terminate all sessions for a user
 */
export async function terminateAllUserSessions(userId: string) {
  const currentSession = await checkPermission("user", "revoke");

  if (currentSession?.user?.id === userId) {
    throw new Error("You cannot terminate your own sessions");
  }

  const [targetUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    throw new Error("User not found");
  }

  await db
    .delete(session)
    .where(eq(session.userId, userId));

  revalidatePath("/user-management");

  await logAudit({
    tableName: "session",
    recordId: userId,
    action: "DELETE",
    oldValues: {
      userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
    },
    notes: "All user sessions terminated",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

/**
 * Verify user email manually
 */
export async function verifyUserEmail(userId: string) {
  const currentSession = await checkPermission("user", "update");

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new Error("User not found");
  }

  await db
    .update(user)
    .set({
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  revalidatePath("/user-management");

  await logAudit({
    tableName: "user",
    recordId: userId,
    action: "UPDATE",
    oldValues: { ...existing },
    newValues: { ...existing, emailVerified: true, updatedAt: new Date() },
    notes: "User email verified",
    context: await getAuditContextFromServerAction(currentSession.user),
  });

  return { success: true };
}

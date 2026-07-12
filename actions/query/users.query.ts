"use server";

import { db } from "@/lib/db";
import { user, session } from "@/auth-schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission, type statement } from "@/lib/permissions";

type PermissionResource = keyof typeof statement;
type PermissionAction<R extends PermissionResource> = (typeof statement)[R][number];

type ListUsersQuery = {
  limit: number;
  offset: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
  filterField?: "role" | "banned";
  filterValue?: string;
  filterOperator?: "eq";
};

type ListedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

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
 * Get all users with optional search and filtering
 */
export async function getAllUsers(params?: {
  search?: string;
  role?: string;
  status?: "active" | "banned";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}) {
  await checkPermission("user", "list");

  try {
    const {
      search,
      role,
      status,
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortDirection = "desc",
    } = params || {};

    const query: ListUsersQuery = {
      limit: 1000,
      offset: 0,
      sortBy,
      sortDirection,
    };

    if (!search && role) {
      query.filterField = "role";
      query.filterValue = role;
      query.filterOperator = "eq";
    } else if (!search && !role && status) {
      query.filterField = "banned";
      query.filterValue = status === "banned" ? "true" : "false";
      query.filterOperator = "eq";
    }

    const result = await auth.api.listUsers({
      query,
      headers: await headers(),
    });

    let users = (result.users || []) as unknown as ListedUser[];
    users = users.filter((u) => u.name !== "Administrator");

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((u) =>
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }

    if (role) {
      users = users.filter((u) => u.role === role);
    }

    if (status) {
      const isBanned = status === "banned";
      users = users.filter((u) => u.banned === isBanned);
    }

    const total = users.length;
    users = users.slice(offset, offset + limit);

    return {
      users,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Error listing users", error);
    throw error;
  }
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string) {
  await checkPermission("user", "read");

  const [userData] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      region: user.region,
      assignedAgency: user.assignedAgency,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userData) {
    throw new Error("User not found");
  }

  const activeSessions = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.createdAt));

  return {
    ...userData,
    sessions: activeSessions,
  };
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  await checkPermission("user", "list");

  const [stats] = await db
    .select({
      totalUsers: sql<number>`count(*) filter (where name != 'Administrator')`,
      totalAdmins: sql<number>`count(*) filter (where role = 'admin' and name != 'Administrator')`,
      totalModerators: sql<number>`count(*) filter (where role = 'moderator' and name != 'Administrator')`,
      totalCitizens: sql<number>`count(*) filter (where role = 'citizen' and name != 'Administrator')`,
      totalBanned: sql<number>`count(*) filter (where banned = true and name != 'Administrator')`,
      totalVerified: sql<number>`count(*) filter (where email_verified = true and name != 'Administrator')`,
    })
    .from(user);

  return {
    totalUsers: Number(stats.totalUsers),
    totalAdmins: Number(stats.totalAdmins),
    totalModerators: Number(stats.totalModerators),
    totalCitizens: Number(stats.totalCitizens),
    totalBanned: Number(stats.totalBanned),
    totalVerified: Number(stats.totalVerified),
  };
}

/**
 * Get list of unique regions for dropdown selection
 */
export async function getRegions() {
  await checkPermission("user", "list");

  const { psgcLocations } = await import("@/lib/db/schema");

  const regions = await db
    .selectDistinct({
      code: psgcLocations.regionCode,
      name: psgcLocations.regionName,
      shortname: psgcLocations.regionShortname,
    })
    .from(psgcLocations)
    .where(sql`${psgcLocations.regionCode} IS NOT NULL`)
    .orderBy(psgcLocations.regionName);

  const formattedRegions = regions
    .filter((r) => r.code && r.name)
    .map((r) => ({
      value: r.code!,
      label: r.shortname || r.name!,
      fullName: r.name!,
    }));

  const uniqueRegions = new Map<string, typeof formattedRegions[0]>();
  for (const r of formattedRegions) {
    if (!uniqueRegions.has(r.value) || (r.label !== r.fullName)) {
      uniqueRegions.set(r.value, r);
    }
  }

  return Array.from(uniqueRegions.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

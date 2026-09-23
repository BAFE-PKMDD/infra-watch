"use server";

import { db } from "@/lib/db";
import { user, session } from "@/auth-schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission, type statement } from "@/lib/permissions";
import { isSameRegion } from "@/lib/moderator-scope";

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
  const currentSession = await checkPermission("user", "list");

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

    // A regional admin only manages staff in their own region — never every account.
    if (currentSession.user.role === "regional_admin") {
      users = users.filter((u) => isSameRegion(u.region, currentSession.user.region));
    }

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
  const currentSession = await checkPermission("user", "read");

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

  // Treat a user outside the regional admin's own region as not found, same as a
  // genuinely missing id — don't reveal that an out-of-scope account exists.
  if (currentSession.user.role === "regional_admin" && !isSameRegion(userData.region, currentSession.user.region)) {
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
  const currentSession = await checkPermission("user", "list");

  // A regional admin's counts cover only their own region — otherwise these totals
  // would reveal headcounts for regions they can't otherwise see into.
  const regionFilter = currentSession.user.role === "regional_admin"
    ? eq(user.region, currentSession.user.region?.trim() ?? "")
    : undefined;

  const [stats] = await db
    .select({
      totalUsers: sql<number>`count(*) filter (where name != 'Administrator')`,
      totalAdmins: sql<number>`count(*) filter (where role = 'admin' and name != 'Administrator')`,
      totalModerators: sql<number>`count(*) filter (where role = 'moderator' and name != 'Administrator')`,
      totalRegionalAdmins: sql<number>`count(*) filter (where role = 'regional_admin' and name != 'Administrator')`,
      totalCitizens: sql<number>`count(*) filter (where role = 'citizen' and name != 'Administrator')`,
      totalBanned: sql<number>`count(*) filter (where banned = true and name != 'Administrator')`,
      totalVerified: sql<number>`count(*) filter (where email_verified = true and name != 'Administrator')`,
    })
    .from(user)
    .where(regionFilter);

  return {
    totalUsers: Number(stats.totalUsers),
    totalAdmins: Number(stats.totalAdmins),
    totalModerators: Number(stats.totalModerators),
    totalRegionalAdmins: Number(stats.totalRegionalAdmins),
    totalCitizens: Number(stats.totalCitizens),
    totalBanned: Number(stats.totalBanned),
    totalVerified: Number(stats.totalVerified),
  };
}

/**
 * Get list of unique regions for dropdown selection.
 *
 * Sourced from projects.region (the same free-text value moderator scoping matches
 * against in lib/scope.ts), not the PSGC region_code reference field: that field isn't
 * a reliable per-region key (e.g. BARMM and SOCCSKSARGEN both have psgc_locations rows
 * with region_code "19"), which previously let a moderator's assigned region resolve to
 * the wrong set of projects.
 */
export async function getRegions() {
  await checkPermission("user", "list");

  const { projects } = await import("@/lib/db/schema");

  const rows = await db
    .selectDistinct({ region: projects.region })
    .from(projects)
    .where(sql`${projects.region} IS NOT NULL AND btrim(${projects.region}) <> ''`);

  return rows
    .map((r) => r.region!)
    .sort((a, b) => a.localeCompare(b))
    .map((region) => ({ value: region, label: region, fullName: region }));
}

"use server";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { feedback, projects } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser, requireAuth } from "@/lib/session";
import { and, desc, eq, exists, ilike, or, sql } from "drizzle-orm";

type FeedbackStatus = "all" | "pending" | "approved" | "rejected";

export type AdminFeedbackItem = {
  id: string;
  projectId: string;
  userId: string | null;
  rating: number | null;
  comment: string;
  category: string;
  media: Array<{ type: "image" | "video"; url: string; caption?: string }>;
  isAnonymous: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  status: string;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  moderationNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  project: {
    id: string;
    abemisId: string;
    projectCode: string | null;
    name: string;
    province: string | null;
    municipality: string | null;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type FeedbackListParams = {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
};

export type MyFeedbackItem = {
  id: string;
  projectId: string;
  rating: number | null;
  comment: string;
  category: string;
  media: Array<{ type: "image" | "video"; url: string; caption?: string }>;
  isAnonymous: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  moderationNote: string | null;
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
};

function getStatus(value: string | undefined): FeedbackStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }

  return "all";
}

function toPositiveInteger(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return fallback;
  }

  return Math.min(Math.floor(value), max);
}

async function requireFeedbackListPermission() {
  const user = await getCurrentUser();

  if (!user) {
    const error = new Error("Unauthorized");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  requirePermission(user.role as string | null | undefined, "feedback", "list");
  return user;
}

export async function getAllFeedback(params: FeedbackListParams = {}): Promise<{
  success: boolean;
  data: AdminFeedbackItem[];
  pagination: Pagination;
  error?: string;
  status?: number;
}> {
  const page = toPositiveInteger(params.page, 1, 10_000);
  const limit = toPositiveInteger(params.limit, 10, 100);

  try {
    const currentUser = await requireFeedbackListPermission();

    const status = getStatus(params.status);
    const search = params.search?.trim();
    const conditions = [];

    if (currentUser.role === "moderator" && currentUser.region) {
      conditions.push(
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.abemisId, feedback.projectId),
                or(
                  ilike(projects.psgcCode, `${currentUser.region}%`),
                  ilike(projects.region, currentUser.region),
                )!,
              ),
            ),
        ),
      );
    }

    if (currentUser.role === "moderator" && currentUser.assignedAgency) {
      conditions.push(
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.abemisId, feedback.projectId),
                eq(projects.program, currentUser.assignedAgency),
              ),
            ),
        ),
      );
    }

    if (status !== "all") {
      conditions.push(eq(feedback.status, status));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(feedback.comment, pattern),
          ilike(projects.name, pattern),
          ilike(projects.abemisId, pattern),
          ilike(projects.projectCode, pattern),
          ilike(authUser.name, pattern),
          ilike(authUser.email, pattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        userId: feedback.userId,
        rating: feedback.rating,
        comment: feedback.comment,
        category: feedback.category,
        media: feedback.media,
        isAnonymous: feedback.isAnonymous,
        helpfulCount: feedback.helpfulCount,
        status: feedback.status,
        moderatedBy: feedback.moderatedBy,
        moderatedAt: feedback.moderatedAt,
        moderationNote: feedback.moderationNote,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        userName: authUser.name,
        userEmail: authUser.email,
        userImage: authUser.image,
        projectUuid: projects.id,
        projectAbemisId: projects.abemisId,
        projectCode: projects.projectCode,
        projectName: projects.name,
        projectProvince: projects.province,
        projectMunicipality: projects.municipality,
      })
      .from(feedback)
      .leftJoin(authUser, eq(authUser.id, feedback.userId))
      .leftJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .leftJoin(authUser, eq(authUser.id, feedback.userId))
      .leftJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(whereClause);

    const total = Number(countRow?.count ?? 0);

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        userId: row.userId,
        rating: row.rating,
        comment: row.comment ?? "",
        category: row.category ?? "general",
        media: row.media ?? [],
        isAnonymous: row.isAnonymous,
        helpfulCount: row.helpfulCount,
        unhelpfulCount: 0,
        status: row.status,
        moderatedBy: row.moderatedBy,
        moderatedAt: row.moderatedAt,
        moderationNote: row.moderationNote,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: row.userId
          ? {
            id: row.userId,
            name: row.userName ?? "Unknown User",
            email: row.userEmail ?? "",
            image: row.userImage,
          }
          : null,
        project: row.projectUuid && row.projectAbemisId && row.projectName
          ? {
            id: row.projectUuid,
            abemisId: row.projectAbemisId,
            projectCode: row.projectCode,
            name: row.projectName,
            province: row.projectProvince,
            municipality: row.projectMunicipality,
          }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch feedback",
      status: error instanceof Error ? (error as Error & { status?: number }).status : undefined,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function getMyFeedback(): Promise<{
  success: boolean;
  data: MyFeedbackItem[];
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const rows = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        rating: feedback.rating,
        comment: feedback.comment,
        category: feedback.category,
        media: feedback.media,
        isAnonymous: feedback.isAnonymous,
        status: feedback.status,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        moderationNote: feedback.moderationNote,
        projectUuid: projects.id,
        projectAbemisId: projects.abemisId,
        projectCode: projects.projectCode,
        projectName: projects.name,
      })
      .from(feedback)
      .leftJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(eq(feedback.userId, user.id))
      .orderBy(desc(feedback.createdAt));

    return {
      success: true,
      data: rows.map((row) => {
        const projectId = row.projectAbemisId ?? row.projectCode ?? row.projectUuid ?? row.projectId;
        const projectCode = row.projectCode ?? row.projectAbemisId ?? row.projectUuid ?? row.projectId;

        return {
          id: row.id,
          projectId: row.projectId,
          rating: row.rating,
          comment: row.comment ?? "",
          category: row.category ?? "general",
          media: row.media ?? [],
          isAnonymous: row.isAnonymous,
          status:
            row.status === "approved" || row.status === "rejected"
              ? row.status
              : "pending",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          moderationNote: row.moderationNote,
          project: row.projectName
            ? {
                id: projectId,
                name: row.projectName,
                code: projectCode,
              }
            : null,
        };
      }),
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch feedback",
    };
  }
}

export async function getFeedbackStats(): Promise<{
  success: boolean;
  data: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    averageRating: number;
  };
  error?: string;
  status?: number;
}> {
  try {
    const currentUser = await requireFeedbackListPermission();
    const conditions = [];

    if (currentUser.role === "moderator" && currentUser.region) {
      conditions.push(
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.abemisId, feedback.projectId),
                or(
                  ilike(projects.psgcCode, `${currentUser.region}%`),
                  ilike(projects.region, currentUser.region),
                )!,
              ),
            ),
        ),
      );
    }

    if (currentUser.role === "moderator" && currentUser.assignedAgency) {
      conditions.push(
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.abemisId, feedback.projectId),
                eq(projects.program, currentUser.assignedAgency),
              ),
            ),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${feedback.status} = 'pending')`,
        approved: sql<number>`count(*) filter (where ${feedback.status} = 'approved')`,
        rejected: sql<number>`count(*) filter (where ${feedback.status} = 'rejected')`,
        averageRating: sql<number>`coalesce(avg(case when ${feedback.status} = 'approved' then ${feedback.rating} else null end), 0)`,
      })
      .from(feedback)
      .where(whereClause);

    return {
      success: true,
      data: {
        total: Number(stats?.total ?? 0),
        pending: Number(stats?.pending ?? 0),
        approved: Number(stats?.approved ?? 0),
        rejected: Number(stats?.rejected ?? 0),
        averageRating: Number(stats?.averageRating ?? 0),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch feedback statistics",
      status: error instanceof Error ? (error as Error & { status?: number }).status : undefined,
      data: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        averageRating: 0,
      },
    };
  }
}

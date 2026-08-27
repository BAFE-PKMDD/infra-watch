"use server";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { formatPublicIssueActivity } from "@/lib/public-issue-activity";
import { feedback, issues, projects } from "@/lib/db/schema";
import type {
  ActivityFeedFilter,
  ActivityFeedItem,
  FeedbackActivityItem,
  IssueActivityItem,
} from "@/types/activity-feed.types";
import { and, asc, desc, eq, ilike, isNotNull, or } from "drizzle-orm";

type ActivityFeedParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: ActivityFeedFilter;
  sort?: "newest" | "oldest";
};

function createPagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
  };
}

function toPositiveInteger(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value) || !value || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

export async function getActivityFeed(params: ActivityFeedParams = {}): Promise<{
  success: boolean;
  data: ActivityFeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
  error?: string;
}> {
  const page = toPositiveInteger(params.page, 1, 10_000);
  const limit = toPositiveInteger(params.limit, 10, 50);

  try {
    const type = params.type ?? "all";
    const sort = params.sort ?? "newest";
    const [feedbackItems, issueItems] = await Promise.all([
      type === "issue" ? Promise.resolve([]) : fetchFeedbackItems(params),
      type === "feedback" ? Promise.resolve([]) : fetchIssueItems(params),
    ]);

    const allItems: ActivityFeedItem[] = [...feedbackItems, ...issueItems].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });

    const offset = (page - 1) * limit;

    return {
      success: true,
      data: allItems.slice(offset, offset + limit),
      pagination: createPagination(page, limit, allItems.length),
    };
  } catch (error) {
    console.error("Failed to fetch activity feed", error);
    return {
      success: false,
      error: "Failed to fetch activity feed",
      data: [],
      pagination: createPagination(page, limit, 0),
    };
  }
}

async function fetchFeedbackItems(params: ActivityFeedParams): Promise<FeedbackActivityItem[]> {
  const search = params.search?.trim();
  const category = params.category?.trim();
  const sort = params.sort ?? "newest";
  const conditions = [eq(feedback.status, "approved")];

  if (category && category !== "all") {
    conditions.push(eq(feedback.category, category));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(feedback.comment, pattern),
        ilike(projects.name, pattern),
        ilike(projects.abemisId, pattern),
        ilike(projects.projectCode, pattern),
      )!,
    );
  }

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
      createdAt: feedback.createdAt,
      userName: authUser.name,
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
    .where(and(...conditions))
    .orderBy(sort === "oldest" ? asc(feedback.createdAt) : desc(feedback.createdAt));

  return rows.map((row): FeedbackActivityItem => ({
    type: "feedback",
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
    commentCount: 0,
    createdAt: row.createdAt,
    user: !row.isAnonymous && row.userId
      ? {
        id: row.userId,
        name: row.userName ?? "Citizen",
        image: row.userImage,
      }
      : null,
    project: row.projectUuid && row.projectAbemisId && row.projectName
      ? {
        id: row.projectAbemisId,
        name: row.projectName,
        sourceProjectId: row.projectCode ?? row.projectAbemisId,
        province: row.projectProvince,
        municipality: row.projectMunicipality,
      }
      : null,
    recentComments: [],
  }));
}

async function fetchIssueItems(params: ActivityFeedParams): Promise<IssueActivityItem[]> {
  const search = params.search?.trim();
  const sort = params.sort ?? "newest";
  const conditions = [];

  // Workflow state is not publication approval. Public activity uses only an
  // explicitly approved moderator-written summary.
  conditions.push(isNotNull(issues.publicApprovedAt));
  conditions.push(isNotNull(issues.publicDescription));

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(issues.ticketNumber, pattern),
        ilike(issues.publicDescription, pattern),
        ilike(issues.category, pattern),
        ilike(issues.province, pattern),
        ilike(projects.name, pattern),
      ),
    );
  }

  const rows = await db
    .select({
      id: issues.id,
      category: issues.category,
      status: issues.status,
      description: issues.publicDescription,
      province: issues.province,
      resolvedAt: issues.resolvedAt,
      createdAt: issues.createdAt,
      projectName: projects.name,
      projectAbemisId: projects.abemisId,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sort === "oldest" ? asc(issues.createdAt) : desc(issues.createdAt));

  return rows.map(formatPublicIssueActivity);
}

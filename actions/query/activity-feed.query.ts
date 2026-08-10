"use server";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { feedback, issues, projects } from "@/lib/db/schema";
import type {
  ActivityFeedFilter,
  ActivityFeedItem,
  FeedbackActivityItem,
  IssueActivityItem,
} from "@/types/activity-feed.types";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

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

function normalizeIssueStatus(status: string): IssueActivityItem["status"] {
  if (status === "reviewing" || status === "resolved" || status === "closed") {
    return status;
  }

  return "pending";
}

function normalizeIssueType(category: string): string {
  const lower = category.toLowerCase();

  if (lower.includes("damage")) return "damage";
  if (lower.includes("delay") || lower.includes("stopped") || lower.includes("stalled")) return "stopped";
  if (lower.includes("safety") || lower.includes("hazard")) return "safety";
  if (lower.includes("flood") || lower.includes("water")) return "flooding";
  if (lower.includes("block")) return "blocked";
  if (lower.includes("quality")) return "quality";

  return "other";
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

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(issues.ticketNumber, pattern),
        ilike(issues.description, pattern),
        ilike(issues.category, pattern),
        ilike(issues.province, pattern),
        ilike(issues.municipality, pattern),
        ilike(issues.barangay, pattern),
        ilike(issues.landmark, pattern),
        ilike(projects.name, pattern),
      ),
    );
  }

  const rows = await db
    .select({
      id: issues.id,
      ticketNumber: issues.ticketNumber,
      projectId: issues.projectId,
      reporterName: issues.reporterName,
      isAnonymous: issues.isAnonymous,
      category: issues.category,
      status: issues.status,
      description: issues.description,
      province: issues.province,
      municipality: issues.municipality,
      barangay: issues.barangay,
      landmark: issues.landmark,
      evidence: issues.evidence,
      resolvedAt: issues.resolvedAt,
      createdAt: issues.createdAt,
      projectName: projects.name,
      projectAbemisId: projects.abemisId,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sort === "oldest" ? asc(issues.createdAt) : desc(issues.createdAt));

  return rows.map((row): IssueActivityItem => {
    const evidence = Array.isArray(row.evidence) ? row.evidence : [];

    return {
      type: "issue",
      id: row.id,
      issueType: normalizeIssueType(row.category),
      issueDescription: row.description,
      status: normalizeIssueStatus(row.status),
      province: row.province ?? "Unknown Province",
      city: row.municipality ?? "Unknown Municipality",
      barangay: row.barangay ?? "Unknown Barangay",
      streetLandmark: row.landmark ?? "",
      reporterName: row.reporterName ?? "Citizen",
      isAnonymous: row.isAnonymous,
      photoUrls: evidence.filter((item) => item.type === "image").map((item) => item.url),
      videoUrls: [],
      responseCount: 0,
      recentResponses: [],
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      project: row.projectAbemisId && row.projectName
        ? {
          id: row.projectAbemisId,
          name: row.projectName,
        }
        : null,
    };
  });
}

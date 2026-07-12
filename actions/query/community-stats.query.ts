"use server";

import { db } from "@/lib/db";
import { feedback, projects } from "@/lib/db/schema";
import { desc, inArray, sql } from "drizzle-orm";

const TRENDING_DAYS = 30;
const TRENDING_LIMIT = 5;

export interface TrendingProject {
  id: string;
  name: string;
  abemisId: string;
  feedbackCount: number;
}

export interface LatestArticle {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  excerpt: string | null;
  source: string;
  category: string;
  createdAt: Date;
}

export interface FeedSidebarData {
  trending: TrendingProject[];
  latestArticles: LatestArticle[];
}

export async function getCommunityStats(): Promise<{
  data: null;
  error: null;
}> {
  return { data: null, error: null };
}

export async function getTopProjects(): Promise<TrendingProject[]> {
  return (await getFeedSidebarData()).trending;
}

export async function getFeedSidebarData(): Promise<FeedSidebarData> {
  try {
    const from = new Date();
    from.setDate(from.getDate() - TRENDING_DAYS);

    const trendingCounts = await db
      .select({
        projectId: feedback.projectId,
        feedbackCount: sql<number>`count(*)`,
      })
      .from(feedback)
      .where(
        sql`${feedback.status} = 'approved' and ${feedback.createdAt} >= ${from}`,
      )
      .groupBy(feedback.projectId)
      .orderBy(desc(sql`count(*)`))
      .limit(TRENDING_LIMIT);

    if (trendingCounts.length === 0) {
      return {
        trending: [],
        latestArticles: [],
      };
    }

    const projectIds = trendingCounts.map((item) => item.projectId);
    const projectRows = await db
      .select({
        id: projects.abemisId,
        name: projects.name,
      })
      .from(projects)
      .where(inArray(projects.abemisId, projectIds));

    const projectMap = new Map(projectRows.map((project) => [project.id, project.name]));

    return {
      trending: trendingCounts
        .map((item) => {
          const name = projectMap.get(item.projectId);
          if (!name) return null;

          return {
            id: item.projectId,
            abemisId: item.projectId,
            name,
            feedbackCount: Number(item.feedbackCount),
          };
        })
        .filter((item): item is TrendingProject => Boolean(item)),
      latestArticles: [],
    };
  } catch (error) {
    console.error("Failed to fetch feed sidebar data", error);
    return {
      trending: [],
      latestArticles: [],
    };
  }
}

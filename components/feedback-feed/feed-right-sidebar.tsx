"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  TrendingUp,
  MessageSquare,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { getFileUrl } from "@/lib/minio-url";
import type {
  FeedSidebarData,
} from "@/actions/query/community-stats.query";
import { getFeedSidebarData } from "@/actions/query/community-stats.query";
import { ProjectPreviewSheet } from "@/components/feedback-feed/project-preview-sheet";

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Skeletons ─────────────────────────────────────────

function TrendingSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-4 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 dark:bg-[#13233c]/60 rounded mb-3" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 flex-1 bg-slate-100 dark:bg-[#13233c]/40 rounded" />
            <div className="h-5 w-8 bg-slate-100 dark:bg-[#13233c]/40 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-4 animate-pulse">
      <div className="h-4 w-28 bg-slate-200 dark:bg-[#13233c]/60 rounded mb-3" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-14 h-10 rounded-lg bg-slate-200 dark:bg-[#13233c]/60 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-full bg-slate-200 dark:bg-[#13233c]/60 rounded" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────
export function FeedRightSidebar() {
  const [data, setData] = useState<FeedSidebarData | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

  useEffect(() => {
    getFeedSidebarData().then(setData);
  }, []);

  if (!data) {
    return (
      <aside className="hidden md:block w-[280px] xl:w-[300px] flex-shrink-0">
        <div className="sticky top-20 space-y-4">
          <TrendingSkeleton />
          <ArticlesSkeleton />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:block w-[280px] xl:w-[300px] flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Trending Projects */}
        {data.trending.length > 0 && (
          <div className="bg-white dark:bg-[#0d1526] rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Most Discussed
            </h3>
            <div className="space-y-1">
              {data.trending.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setPreviewProjectId(project.id)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group w-full text-left cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4 text-right">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate flex-1">
                    {project.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full flex-shrink-0">
                    <MessageSquare className="w-3 h-3" />
                    {project.feedbackCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Latest Articles */}
        {data.latestArticles.length > 0 && (
          <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-4">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5" />
              Latest Articles
            </h3>
            <div className="space-y-3">
              {data.latestArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 group"
                >
                  {article.thumbnail ? (
                    <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-[#13233c]/60">
                      <Image
                        src={getFileUrl(article.thumbnail)}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-10 rounded-lg bg-slate-100 dark:bg-[#13233c]/60 flex-shrink-0 flex items-center justify-center">
                      <Newspaper className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 leading-tight">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {timeAgo(article.createdAt)}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Project preview sheet */}
      <ProjectPreviewSheet
        projectId={previewProjectId}
        open={!!previewProjectId}
        onOpenChange={(open) => !open && setPreviewProjectId(null)}
      />
    </aside>
  );
}

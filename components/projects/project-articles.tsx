"use client";

import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

import { FileText } from "lucide-react";
import type { Article } from "@/types/article.types";
import { getFullUrl } from "@/lib/minio-url";
import { useTranslation } from "@/i18n";

// Helper to check if URL is from localhost MinIO
const isLocalMinIO = (url: string | null) => {
  if (!url) return false;
  return url.includes('localhost:9000') || url.includes('127.0.0.1:9000');
};

interface ProjectArticlesProps {
  articles: Article[];
}

export function ProjectArticles({ articles }: ProjectArticlesProps) {
  const { t, language } = useTranslation();

  if (!articles || articles.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t("projectDetail.sidebar.articles")}</h2>
        </div>
        <div className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("projectDetail.tabs.articles.empty")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("projectDetail.tabs.articles.emptyDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">
          {t("projectDetail.sidebar.articles")} ({articles.length})
        </h2>
      </div>
      <div className="p-6">
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={index === 0 ? "" : "pt-6"}
            >
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group pb-6"
              >
                <div className="flex gap-6">
                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    {/* Category Tag */}
                    <div className="mb-2">
                      <span className="inline-block text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        {article.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-3">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta Information */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {article.source && (
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="line-clamp-1">{article.source}</span>
                        </div>
                      )}
                      {article.publishedDate && (
                        <div className="flex items-center gap-1.5">
                          <span>
                            {new Date(article.publishedDate).toLocaleDateString(language === 'tl' ? "en-PH" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Section */}
                  <div className="flex-shrink-0">
                    {article.thumbnail ? (
                      <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={getFullUrl(article.thumbnail) || ''}
                          alt={article.thumbnailAlt || article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized={isLocalMinIO(getFullUrl(article.thumbnail))}
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-32 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

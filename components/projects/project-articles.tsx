"use client";
import Image from "next/image";
import type { Article } from "@/types/article.types";
import { getFullUrl } from "@/lib/minio-url";
import { useTranslation } from "@/i18n";

export function ProjectArticles({ articles }: { articles: Article[] }) {
  const { t, language } = useTranslation();
  return (
    <section className="rounded-lg border border-slate-300 bg-background p-5 sm:p-6 dark:border-slate-700">
      <h2 className="text-lg font-semibold">
        {t("projectDetail.sidebar.articles")}
        {articles.length ? ` (${articles.length})` : ""}
      </h2>
      {!articles.length ? (
        <div className="py-8 text-center">
          <h3 className="text-lg font-semibold">
            {t("projectDetail.tabs.articles.empty")}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t("projectDetail.tabs.articles.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-300 dark:divide-slate-700">
          {articles.map((article) => (
            <article
              key={article.id}
              className="flex flex-col gap-5 py-5 first:pt-0 sm:flex-row"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
                  {article.category} · {article.source}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{article.title}</h3>
                {article.excerpt ? (
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {article.excerpt}
                  </p>
                ) : null}
                {article.publishedDate ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {new Date(article.publishedDate).toLocaleDateString(
                      language === "tl" ? "en-PH" : "en-US",
                      { timeZone: "Asia/Manila", dateStyle: "medium" },
                    )}
                  </p>
                ) : null}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary dark:text-indigo-300"
                >
                  {t("publicContent.read")}
                </a>
              </div>
              {article.thumbnail ? (
                <div className="relative h-40 w-full shrink-0 sm:w-48">
                  <Image
                    src={getFullUrl(article.thumbnail) || article.thumbnail}
                    alt={article.thumbnailAlt || article.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 192px"
                    unoptimized
                    className="rounded-md object-cover"
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

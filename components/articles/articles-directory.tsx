"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import type { getPublicArticles } from "@/lib/content-management";
import { ARTICLE_CATEGORIES } from "@/types/article.types";
import {
  contentButtonClass,
  contentControlClass,
} from "@/components/admin/content/content-controls";

type ArticleList = Awaited<ReturnType<typeof getPublicArticles>>;

export function ArticlesDirectory({ initial }: { initial: ArticleList }) {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["public-articles", query, category, page],
    initialData: !query && !category && page === 1 ? initial : undefined,
    queryFn: async () => {
      const params = new URLSearchParams({
        search: query,
        category,
        page: String(page),
      });
      const response = await fetch(`/api/public/articles?${params}`);
      if (!response.ok) throw new Error("Articles unavailable");
      return response.json() as Promise<ArticleList>;
    },
  });
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t("publicContent.articlesTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base dark:text-slate-300">
          {t("publicContent.articlesDescription")}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label
            htmlFor="article-search"
            className="block text-sm font-semibold"
          >
            {t("publicContent.search")}
          </label>
          <input
            id="article-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={contentControlClass}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="article-category"
            className="block text-sm font-semibold"
          >
            {t("publicContent.category")}
          </label>
          <select
            id="article-category"
            className={contentControlClass}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("publicContent.all")}</option>
            {ARTICLE_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isFetching ? (
        <p role="status" className="text-sm">
          {t("publicContent.loading")}
        </p>
      ) : null}
      {isError ? (
        <div role="alert">
          <p>{t("publicContent.error")}</p>
          <Button
            className={`mt-3 ${contentButtonClass}`}
            onClick={() => refetch()}
          >
            {t("publicContent.retry")}
          </Button>
        </div>
      ) : data?.data.length ? (
        <div className="divide-y divide-slate-300 dark:divide-slate-700">
          {data.data.map((article) => (
            <article
              key={article.id}
              className="flex flex-col gap-5 py-6 first:pt-0 sm:flex-row"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
                  {article.category} · {article.source}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{article.title}</h2>
                {article.excerpt ? (
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {article.excerpt}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {article.author}
                  {article.author && article.publishedDate ? " · " : ""}
                  {article.publishedDate
                    ? new Date(article.publishedDate).toLocaleDateString(
                        language === "tl" ? "en-PH" : "en-US",
                        { timeZone: "Asia/Manila", dateStyle: "medium" },
                      )
                    : ""}
                </p>
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
                <div className="relative h-44 w-full shrink-0 sm:w-56">
                  <Image
                    src={article.thumbnail}
                    alt={article.thumbnailAlt || article.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 224px"
                    unoptimized
                    className="rounded-md object-cover"
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : !isFetching ? (
        <p className="rounded-md border border-dashed border-slate-400 p-8 text-center text-sm">
          {t(
            query || category
              ? "publicContent.noMatches"
              : "publicContent.empty",
          )}
        </p>
      ) : null}
      {data && data.total > data.pageSize ? (
        <nav
          aria-label="Article pages"
          className="flex items-center justify-between gap-3"
        >
          <Button
            variant="outline"
            className={contentButtonClass}
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isFetching}
          >
            {t("publicContent.previous")}
          </Button>
          <p className="text-sm">{t("publicContent.page", { page })}</p>
          <Button
            variant="outline"
            className={contentButtonClass}
            onClick={() => setPage(page + 1)}
            disabled={page * data.pageSize >= data.total || isFetching}
          >
            {t("publicContent.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

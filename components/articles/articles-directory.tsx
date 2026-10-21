"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Newspaper,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { getPublicArticles } from "@/lib/content-management";
import { cn } from "@/lib/utils";
import { ARTICLE_CATEGORIES } from "@/types/article.types";
import {
  contentButtonClass,
  contentControlClass,
} from "@/components/admin/content/content-controls";

type ArticleList = Awaited<ReturnType<typeof getPublicArticles>>;
type PublicArticle = ArticleList["data"][number];

const categoryLabels = Object.fromEntries(
  ARTICLE_CATEGORIES.map((option) => [option.value, option.label]),
);

function pageWindow(page: number, pages: number) {
  const size = Math.min(5, pages);
  const start = Math.min(Math.max(1, page - 2), pages - size + 1);
  return Array.from({ length: size }, (_, index) => start + index);
}

function ArticlesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className={cn(
            "space-y-3",
            index === 0 && "md:col-span-2 md:row-span-2",
          )}
        >
          <Skeleton
            className={cn(
              "w-full rounded-2xl",
              index === 0 ? "min-h-[320px] md:min-h-[400px]" : "aspect-[16/10]",
            )}
          />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function ArticleCard({
  article,
  featured,
}: {
  article: PublicArticle;
  featured: boolean;
}) {
  const { t, language } = useTranslation();
  const locale = language === "tl" ? "en-PH" : "en-US";
  const date = article.publishedDate ?? article.createdAt;
  return (
    <article
      className={cn(
        "group flex flex-col gap-3",
        featured && "md:col-span-2 md:row-span-2",
      )}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "relative block overflow-hidden rounded-2xl border bg-muted",
          featured ? "min-h-[320px] flex-1 md:min-h-[400px]" : "aspect-[16/10]",
        )}
      >
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt=""
            fill
            sizes={
              featured
                ? "(max-width: 768px) 100vw, 50vw"
                : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            unoptimized
            className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper
              className="size-12 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
        )}
        <span className="absolute bottom-4 left-4 rounded-full bg-primary px-3 py-1.5 text-[0.8125rem] font-bold tracking-wider text-primary-foreground uppercase">
          {categoryLabels[article.category] ?? article.category}
        </span>
        <span className="absolute top-4 right-4 rounded-full bg-background/90 p-2 text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <ExternalLink className="size-4" aria-hidden="true" />
        </span>
      </a>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold tracking-widest text-primary uppercase dark:text-indigo-300">
          {article.source}
        </span>
        <h2
          className={cn(
            "leading-tight font-bold",
            featured ? "text-xl md:text-2xl" : "text-lg",
          )}
        >
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:text-indigo-300"
          >
            {article.title}
            <span className="sr-only"> {t("publicContent.opensInNewTab")}</span>
          </a>
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {article.author ? (
            <>
              <User className="size-3.5" aria-hidden="true" />
              <span>{article.author}</span>
              <span aria-hidden="true">•</span>
            </>
          ) : null}
          <time dateTime={new Date(date).toISOString()}>
            {new Date(date).toLocaleDateString(locale, {
              timeZone: "Asia/Manila",
              dateStyle: "long",
            })}
          </time>
        </p>
        {article.excerpt ? (
          <p
            className={cn(
              "leading-relaxed text-slate-700 dark:text-slate-300",
              featured ? "line-clamp-3 text-base" : "line-clamp-2 text-sm",
            )}
          >
            {article.excerpt}
          </p>
        ) : null}
        {article.projectId ? (
          <Link
            href={`/projects/${encodeURIComponent(article.projectId)}`}
            className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary dark:hover:text-indigo-300"
          >
            <span className="truncate">
              {t("publicContent.related", {
                project: article.projectName || article.projectId,
              })}
            </span>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ArticlesDirectory({ initial }: { initial: ArticleList }) {
  const { t } = useTranslation();
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
    placeholderData: keepPreviousData,
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
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = Boolean(query || category);
  const goToPage = (next: number) => {
    setPage(next);
    document
      .getElementById("articles-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mx-auto max-w-4xl text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t("publicContent.articlesTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base dark:text-slate-300">
          {t("publicContent.articlesDescription")}
        </p>
      </header>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border bg-muted/40 p-4 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="article-search" className="sr-only">
            {t("publicContent.search")}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="article-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("publicContent.searchPlaceholder")}
            className={cn(contentControlClass, "rounded-lg pl-10")}
          />
        </div>
        <div className="relative sm:w-56">
          <label htmlFor="article-category" className="sr-only">
            {t("publicContent.category")}
          </label>
          <Filter
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <select
            id="article-category"
            className={cn(
              contentControlClass,
              "appearance-none rounded-lg pr-9 pl-10",
            )}
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
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
      <section id="articles-results" className="scroll-mt-24">
        <p role="status" className="sr-only">
          {isFetching ? t("publicContent.loading") : ""}
        </p>
        {isError ? (
          <div role="alert" className="text-center">
            <p>{t("publicContent.error")}</p>
            <Button
              className={`mt-3 ${contentButtonClass}`}
              onClick={() => refetch()}
            >
              {t("publicContent.retry")}
            </Button>
          </div>
        ) : !data ? (
          <ArticlesSkeleton />
        ) : data.data.length ? (
          <div
            className={cn(
              "grid grid-cols-1 gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-4",
              isFetching && "opacity-60 transition-opacity",
            )}
            aria-busy={isFetching}
          >
            {data.data.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                featured={index === 0}
              />
            ))}
          </div>
        ) : !isFetching ? (
          <div className="py-16 text-center">
            <Newspaper
              className="mx-auto mb-4 size-14 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-sm">
              {t(filtered ? "publicContent.noMatches" : "publicContent.empty")}
            </p>
            {filtered ? (
              <Button
                variant="outline"
                className={`mt-4 ${contentButtonClass}`}
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setCategory("");
                  setPage(1);
                }}
              >
                {t("publicContent.clearFilters")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
      {data && data.total > data.pageSize ? (
        <nav
          aria-label="Article pages"
          className="flex flex-col items-center justify-between gap-4 sm:flex-row"
        >
          <p className="text-sm text-muted-foreground">
            {t("publicContent.showing", {
              from: (page - 1) * data.pageSize + 1,
              to: Math.min(page * data.pageSize, data.total),
              total: data.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className={contentButtonClass}
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft aria-hidden="true" />
              {t("publicContent.previous")}
            </Button>
            <ul className="hidden items-center gap-1 sm:flex">
              {pageWindow(page, pages).map((number) => (
                <li key={number}>
                  <Button
                    variant={number === page ? "default" : "ghost"}
                    className={cn(contentButtonClass, "w-11")}
                    aria-current={number === page ? "page" : undefined}
                    aria-label={t("publicContent.page", { page: number })}
                    onClick={() => goToPage(number)}
                    disabled={isFetching}
                  >
                    {number}
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className={contentButtonClass}
              onClick={() => goToPage(page + 1)}
              disabled={page >= pages || isFetching}
            >
              {t("publicContent.next")}
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

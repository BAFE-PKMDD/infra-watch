"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import type { ListSortKey } from "@/lib/public-analytics/aggregate";
import type { PublicStageKey } from "@/lib/public-analytics/rules";
import { publicAnalyticsStrings as S, format, formatCount, formatPesos } from "@/lib/public-analytics/strings";

import { Section } from "./chart-card";
import { StageSwatch } from "./stage-bar";

const t = S.en;

type Row = {
  id: string;
  code: string;
  name: string;
  projectType: string;
  municipality: string | null;
  province: string | null;
  year: number | null;
  stage: PublicStageKey;
  budget: number | null;
};

type ListResponse = { total: number; page: number; totalPages: number; sort: ListSortKey; direction: "asc" | "desc"; rows: Row[] };

const COLUMNS: Array<{ key: ListSortKey; numeric?: boolean }> = [
  { key: "name" },
  { key: "projectType" },
  { key: "municipality" },
  { key: "province" },
  { key: "year", numeric: true },
  { key: "stage" },
  { key: "budget", numeric: true },
];

export function ProjectList({ query }: { query: string }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<{ key: ListSortKey; direction: "asc" | "desc" }>({ key: "year", direction: "desc" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const searchId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const [pageQuery, setPageQuery] = useState(query);
  if (pageQuery !== query) {
    setPageQuery(query);
    setPage(1);
  }

  const params = new URLSearchParams(query);
  if (debounced) params.set("q", debounced);
  params.set("sort", sort.key);
  params.set("dir", sort.direction);
  const listParams = params.toString();

  useEffect(() => {
    const controller = new AbortController();
    const pageParams = new URLSearchParams(listParams);
    pageParams.set("page", String(page));
    fetch(`/api/public/projects?${pageParams.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: ListResponse) => {
        setData(json);
        setFailed(false);
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [listParams, page]);

  const toggleSort = (key: ListSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  const csvParams = new URLSearchParams(listParams);
  csvParams.set("format", "csv");

  return (
    <Section title={t.list.title}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 sm:max-w-md">
          <label htmlFor={searchId} className="text-sm font-medium text-pa-ink-2">{t.list.searchLabel}</label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-pa-axis bg-pa-surface-2 px-3 text-base text-pa-ink"
          />
        </div>
        <a
          href={`/api/public/projects?${csvParams.toString()}`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-pa-accent px-4 text-base font-medium text-pa-surface hover:opacity-90"
          download
        >
          {t.list.download}
        </a>
      </div>

      <p className="mt-3 text-base text-pa-ink-2" aria-live="polite">
        {failed ? t.page.unavailable : data ? format(t.list.showing, { count: formatCount(data.total) }) : t.list.loading}
      </p>

      <div className="mt-2 max-w-full overflow-x-auto rounded-md border border-pa-hair" tabIndex={0} role="region" aria-label={t.list.title}>
        <table className="w-full min-w-[52rem] border-collapse text-left text-base">
          <thead className="bg-pa-surface-2 text-sm text-pa-ink-2">
            <tr>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                    className={column.numeric ? "text-right" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={format(t.list.sortBy, { column: t.list.columns[column.key] })}
                      className={`inline-flex min-h-11 w-full items-center gap-1 px-3 font-medium ${column.numeric ? "justify-end" : ""} ${active ? "text-pa-ink" : ""}`}
                    >
                      {t.list.columns[column.key]}
                      <span aria-hidden="true">{active ? (sort.direction === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data?.rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-pa-ink-2">{t.list.empty}</td>
              </tr>
            ) : null}
            {data?.rows.map((row) => (
              <tr key={row.id} className="border-t border-pa-hair align-top">
                <td className="px-3 py-2">
                  <Link href={`/projects/${row.id}`} className="font-medium text-pa-accent underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                  <span className="pa-mono block text-sm text-pa-muted">{row.code}</span>
                </td>
                <td className="px-3 py-2 text-pa-ink">{row.projectType}</td>
                <td className="px-3 py-2 text-pa-ink">{row.municipality ?? "—"}</td>
                <td className="px-3 py-2 text-pa-ink">{row.province ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-pa-ink">{row.year ?? "—"}</td>
                <td className="px-3 py-2 text-pa-ink">
                  <span className="inline-flex items-center gap-2"><StageSwatch stage={row.stage} />{t.stages[row.stage]}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-pa-ink">
                  {row.budget !== null ? formatPesos(row.budget) : <span className="text-pa-ink-2">{t.chart.noBudget}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 ? (
        <nav aria-label={t.list.title} className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="min-h-11 rounded-md border border-pa-axis px-4 text-base font-medium text-pa-ink disabled:opacity-50"
          >
            {t.list.previous}
          </button>
          <span className="text-base text-pa-ink-2">{format(t.list.page, { page: data.page, total: data.totalPages })}</span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="min-h-11 rounded-md border border-pa-axis px-4 text-base font-medium text-pa-ink disabled:opacity-50"
          >
            {t.list.next}
          </button>
        </nav>
      ) : null}
    </Section>
  );
}

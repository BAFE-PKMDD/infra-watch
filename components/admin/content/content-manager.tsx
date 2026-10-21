"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadContent,
  removeContent,
  saveContent,
} from "@/actions/mutation/content.mutation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getAnnouncementStatus,
  type ContentKind,
  type ManagedList,
  type ManagedRecord,
} from "@/lib/content-models";
import { CONTENT_CONFIG } from "./content-form-config";
import { ArticleEditor } from "./article-editor";
import { MarkdownContent } from "./markdown-content";
import { contentControlClass, contentButtonClass } from "./content-controls";

function formatDate(value: unknown, withTime = false) {
  return value
    ? new Date(String(value)).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        ...(withTime
          ? { dateStyle: "medium", timeStyle: "short" }
          : { dateStyle: "medium" }),
      })
    : "Not set";
}

function ContentEditor({
  kind,
  record,
  onSaved,
  onClose,
}: {
  kind: ContentKind;
  record: ManagedRecord | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const config = CONTENT_CONFIG[kind];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(String(record?.content || ""));
  const busy = useRef(false);
  const contentInput = useRef<HTMLTextAreaElement>(null);
  function formatAnnouncement(before: string, after = "") {
    const area = contentInput.current;
    if (!area) return;
    const start = area.selectionStart,
      end = area.selectionEnd;
    const selected = area.value.slice(start, end) || "text";
    area.value = `${area.value.slice(0, start)}${before}${selected}${after}${area.value.slice(end)}`;
    setPreview(area.value);
    area.focus();
    area.setSelectionRange(
      start + before.length,
      start + before.length + selected.length,
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(form),
    );
    for (const field of config.fields) {
      if (field.type === "checkbox")
        data[field.name] = Boolean(data[field.name]);
      if (field.type === "number") data[field.name] = Number(data[field.name]);
      if (field.type === "date" || field.type === "datetime-local")
        data[field.name] = data[field.name]
          ? new Date(String(data[field.name])).toISOString()
          : null;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await saveContent(kind, data, record?.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(`${record ? "Updated" : "Created"} ${config.singular}`);
      onSaved();
    } catch {
      setError("Could not save. Your entries are still here; try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        {config.fields.map((field) => {
          const initial = record?.[field.name] ?? field.defaultValue ?? "";
          const value = Array.isArray(initial)
            ? initial.join(", ")
            : field.type === "date" && initial
              ? new Date(String(initial)).toISOString().slice(0, 10)
              : field.type === "datetime-local" && initial
                ? new Date(
                    new Date(String(initial)).getTime() -
                      new Date(String(initial)).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : String(initial);
          return (
            <div
              key={field.name}
              className={
                field.type === "textarea" ||
                field.type === "project" ||
                field.name === "title"
                  ? "space-y-2 sm:col-span-2"
                  : "space-y-2"
              }
            >
              {field.type === "checkbox" ? (
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name={field.name}
                    defaultChecked={Boolean(initial)}
                    className="size-5 accent-primary"
                  />
                  {field.label}
                </label>
              ) : (
                <>
                  <label
                    htmlFor={`content-${field.name}`}
                    className="block text-sm font-semibold"
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  {field.options ? (
                    <select
                      id={`content-${field.name}`}
                      name={field.name}
                      defaultValue={value}
                      className={contentControlClass}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={`content-${field.name}`}
                      name={field.name}
                      ref={field.name === "content" ? contentInput : undefined}
                      defaultValue={value}
                      required={field.required}
                      maxLength={field.maxLength}
                      rows={field.name === "content" ? 8 : 3}
                      className={contentControlClass}
                      onChange={
                        field.name === "content"
                          ? (event) => setPreview(event.target.value)
                          : undefined
                      }
                    />
                  ) : (
                    <input
                      id={`content-${field.name}`}
                      name={field.name}
                      type={field.type || "text"}
                      defaultValue={value}
                      required={field.required}
                      maxLength={field.maxLength}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className={contentControlClass}
                    />
                  )}
                  {field.name === "content" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={contentButtonClass}
                        onClick={() => formatAnnouncement("**", "**")}
                      >
                        Bold
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={contentButtonClass}
                        onClick={() => formatAnnouncement("*", "*")}
                      >
                        Italic
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={contentButtonClass}
                        onClick={() => formatAnnouncement("- ")}
                      >
                        List item
                      </Button>
                    </div>
                  ) : null}
                  {field.hint ? (
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {field.hint}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </fieldset>
      {kind === "announcements" && preview ? (
        <section className="border-t border-slate-300 pt-4 dark:border-slate-600">
          <h3 className="mb-3 text-lg font-semibold">Content preview</h3>
          <MarkdownContent content={preview} />
        </section>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-600 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 border-t border-slate-300 pt-4 dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          className={contentButtonClass}
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className={contentButtonClass} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function ContentManager({
  kind,
  initial,
  userId,
  moderator,
  permissions,
}: {
  kind: ContentKind;
  initial: ManagedList;
  userId: string;
  moderator: boolean;
  permissions: { create: boolean; update: boolean; delete: boolean };
}) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ record: ManagedRecord | null } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<ManagedRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const config = CONTENT_CONFIG[kind];
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["managed-content", kind, userId, debouncedSearch, page],
    queryFn: () => loadContent(kind, { search: debouncedSearch, page }),
    initialData: !debouncedSearch && page === 1 ? initial : undefined,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["public-articles"] });
    void queryClient.invalidateQueries({ queryKey: ["active-announcement"] });
    void queryClient.invalidateQueries({ queryKey: ["public-map-layers"] });
    return queryClient.invalidateQueries({
      queryKey: ["managed-content", kind, userId],
    });
  };
  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError(null);
    try {
      const result = await removeContent(kind, deleting.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setDeleting(null);
      setPage(1);
      await refresh();
      toast.success(`Deleted ${config.singular}`);
    } catch {
      setDeleteError("Could not delete. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const articlesView = kind === "articles";
  const columns =
    kind === "articles"
      ? ["Title", "Source", "Category", "Projects", "Date added"]
      : kind === "announcements"
        ? ["Title", "Status", "Display from", "Display until"]
        : ["Name", "Workspace / layer", "Opacity / order", "Status"];
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md space-y-2">
          <label
            htmlFor="content-search"
            className="block text-sm font-semibold"
          >
            Search {config.title.toLowerCase()}
          </label>
          <input
            id="content-search"
            disabled={!ready}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={contentControlClass}
            type="search"
          />
        </div>
        {permissions.create ? (
          <Button
            className={contentButtonClass}
            onClick={() => setEditor({ record: null })}
            disabled={!ready}
          >
            Add {config.singular}
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300" role="status">
        {isFetching ? "Loading records…" : `${data?.total ?? 0} records`}
      </p>
      {isError ? (
        <div role="alert" className="rounded-md border border-red-500 p-5">
          <p>Records could not be loaded.</p>
          <Button
            className={`mt-3 ${contentButtonClass}`}
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : data?.data.length ? (
        <>
          <p className="text-sm text-slate-600 lg:hidden dark:text-slate-300">
            Scroll the table horizontally to see all columns.
          </p>
          <div
            className={
              articlesView
                ? "overflow-hidden rounded-xl border border-slate-300 bg-background dark:border-slate-700"
                : undefined
            }
          >
            {articlesView ? (
              <div className="border-b border-slate-300 p-4 sm:p-6 dark:border-slate-700">
                <h2 className="text-lg font-semibold">All Articles</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {data.total} result{data.total === 1 ? "" : "s"} found
                </p>
              </div>
            ) : null}
            <div
              tabIndex={0}
              role="region"
              aria-label={`${config.title} table`}
              className={
                articlesView
                  ? "overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary"
                  : "overflow-x-auto rounded-lg border border-slate-300 bg-background focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700"
              }
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead
                  className={
                    articlesView
                      ? "border-b border-slate-300 bg-muted/60 dark:border-slate-700"
                      : "border-b border-slate-300 bg-muted dark:border-slate-700"
                  }
                >
                  <tr>
                    {[...columns, "Actions"].map((column) => (
                      <th
                        key={column}
                        className={
                          articlesView
                            ? "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                            : "px-4 py-3 font-semibold"
                        }
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-200 last:border-0 hover:bg-muted/40 dark:border-slate-800"
                    >
                      <td
                        className={
                          articlesView
                            ? "max-w-md px-6 py-4"
                            : "max-w-xs px-4 py-3"
                        }
                      >
                        <div className="flex items-start gap-3">
                          {articlesView ? (
                            record.thumbnail ? (
                              <Image
                                src={String(record.thumbnail)}
                                alt=""
                                width={64}
                                height={64}
                                unoptimized
                                className="size-16 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <FileText
                                  className="size-7 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </div>
                            )
                          ) : null}
                          <div className="min-w-0">
                            <p className="break-words font-semibold">
                              {String(record.title || record.name)}
                            </p>
                            {kind === "articles" ? (
                              <a
                                href={String(record.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-1 text-primary hover:underline dark:text-indigo-300"
                              >
                                View Article
                                <ExternalLink
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  (opens in a new tab)
                                </span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {kind === "articles" ? (
                        <>
                          <td className="max-w-48 break-words px-6 py-4">
                            {String(record.source)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-md bg-secondary px-2 py-1 text-sm font-medium capitalize text-secondary-foreground">
                              {String(record.category)}
                            </span>
                          </td>
                          <td className="max-w-48 break-all px-6 py-4">
                            {record.projectId ? (
                              <span className="font-mono text-sm">
                                {String(record.projectId)}
                              </span>
                            ) : (
                              <span className="italic text-slate-600 dark:text-slate-300">
                                No project
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {formatDate(record.createdAt)}
                          </td>
                        </>
                      ) : kind === "announcements" ? (
                        <>
                          <td className="px-4 py-3">
                            {getAnnouncementStatus({
                              isActive: Boolean(record.isActive),
                              startDate: record.startDate as Date | null,
                              endDate: record.endDate as Date | null,
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(record.startDate, true)}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(record.endDate, true)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            {String(record.workspace)}
                            <br />
                            {String(record.layerName)}
                          </td>
                          <td className="px-4 py-3">
                            {Math.round(Number(record.opacity) * 100)}% /{" "}
                            {String(record.displayOrder)}
                          </td>
                          <td className="px-4 py-3">
                            {record.isActive ? "Active" : "Inactive"}
                          </td>
                        </>
                      )}
                      <td className={articlesView ? "px-6 py-4" : "px-4 py-3"}>
                        <div className="flex gap-2">
                          {permissions.update ? (
                            articlesView ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`${contentButtonClass} size-11 text-primary dark:text-indigo-300`}
                                aria-label={`Edit ${String(record.title)}`}
                                onClick={() => setEditor({ record })}
                                disabled={!ready}
                              >
                                <SquarePen aria-hidden="true" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className={contentButtonClass}
                                onClick={() => setEditor({ record })}
                                disabled={!ready}
                              >
                                Edit
                              </Button>
                            )
                          ) : null}
                          {permissions.delete ? (
                            articlesView ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`${contentButtonClass} size-11 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
                                aria-label={`Delete ${String(record.title)}`}
                                onClick={() => {
                                  setDeleting(record);
                                  setDeleteError(null);
                                }}
                                disabled={!ready}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className={`${contentButtonClass} text-red-700 dark:text-red-300`}
                                onClick={() => {
                                  setDeleting(record);
                                  setDeleteError(null);
                                }}
                                disabled={!ready}
                              >
                                Delete
                              </Button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Page {page} of{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={contentButtonClass}
                disabled={page <= 1 || isFetching}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className={contentButtonClass}
                disabled={page * data.pageSize >= data.total || isFetching}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : !isFetching ? (
        <p className="rounded-lg border border-dashed border-slate-400 p-8 text-center text-sm">
          {debouncedSearch
            ? "No records match this search."
            : `No ${config.title.toLowerCase()} have been added yet.`}
        </p>
      ) : null}
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        {kind === "articles" ? (
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <DialogHeader className="border-b p-6 pr-16">
              <DialogTitle className="text-base font-semibold">
                {editor?.record ? "Edit Article" : "Add New Article"}
              </DialogTitle>
              <DialogDescription>
                Link an external article or publication to INFRA Watch projects.
                Required fields are marked with an asterisk.
              </DialogDescription>
            </DialogHeader>
            {editor ? (
              <ArticleEditor
                key={editor.record?.id || "new"}
                record={editor.record}
                moderator={moderator}
                onClose={() => setEditor(null)}
                onSaved={() => {
                  setEditor(null);
                  void refresh();
                }}
              />
            ) : null}
          </DialogContent>
        ) : (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editor?.record ? "Edit" : "Add"} {config.singular}
              </DialogTitle>
              <DialogDescription>
                Required fields are marked with an asterisk.
              </DialogDescription>
            </DialogHeader>
            {editor ? (
              <ContentEditor
                key={editor.record?.id || "new"}
                kind={kind}
                record={editor.record}
                onClose={() => setEditor(null)}
                onSaved={() => {
                  setEditor(null);
                  void refresh();
                }}
              />
            ) : null}
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {config.singular}?</DialogTitle>
            <DialogDescription>
              {String(deleting?.title || deleting?.name || "")} will be removed.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {deleteError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className={contentButtonClass}
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              className={`${contentButtonClass} bg-red-700 text-white hover:bg-red-800`}
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

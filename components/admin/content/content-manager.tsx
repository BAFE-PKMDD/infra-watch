"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getFullUrl } from "@/lib/minio-url";
import { useAuth } from "@/providers/auth-provider";
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

function ProjectPicker({
  initialCode,
  required,
}: {
  initialCode: string;
  required: boolean;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState(initialCode);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isFetching, isError } = useQuery({
    queryKey: [
      "article-project-search",
      user?.id,
      user?.role,
      user?.region,
      user?.assignedAgency,
      query,
    ],
    enabled: Boolean(user?.id) && query.trim().length >= 2,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/projects?search=${encodeURIComponent(query)}&pageSize=10`,
      );
      if (!response.ok) throw new Error("Project search unavailable");
      return response.json() as Promise<{
        projects: { abemisId: string; name: string }[];
      }>;
    },
  });
  return (
    <div className="space-y-2">
      <input type="hidden" name="projectId" value={code} />
      {code ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 px-3 dark:border-slate-600">
          <span className="break-all text-sm">{code}</span>
          <Button
            type="button"
            variant="ghost"
            className={contentButtonClass}
            onClick={() => {
              setCode("");
              setSearch("");
            }}
          >
            Clear
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor="article-project-search" className="sr-only">
            Search related project
          </label>
          <input
            id="article-project-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            required={required && !code}
            placeholder="Search project name or code"
            className={contentControlClass}
            autoComplete="off"
          />
          {isFetching ? (
            <p role="status" className="text-sm">
              Searching projects…
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              Project search is unavailable. Try again.
            </p>
          ) : query.length >= 2 && data?.projects.length === 0 ? (
            <p className="text-sm">No projects match this search.</p>
          ) : null}
          {search && data?.projects.length ? (
            <ul className="max-h-56 overflow-y-auto rounded-md border border-slate-300 dark:border-slate-600">
              {data.projects.map((project) => (
                <li key={project.abemisId}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => {
                      setCode(project.abemisId);
                      setSearch("");
                    }}
                  >
                    <span className="block font-semibold">{project.name}</span>
                    <span className="block">{project.abemisId}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

function ContentEditor({
  kind,
  record,
  moderator,
  onSaved,
  onClose,
}: {
  kind: ContentKind;
  record: ManagedRecord | null;
  moderator: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const config = CONTENT_CONFIG[kind];
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(String(record?.content || ""));
  const busy = useRef(false);
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLTextAreaElement>(null);
  async function uploadThumbnail(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload?folder=articles", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        path?: string;
        kind?: string;
        error?: string;
      };
      if (!response.ok || !result.path || result.kind !== "image")
        throw new Error(result.error || "Thumbnail upload failed");
      const url = getFullUrl(result.path);
      if (!url) throw new Error("Thumbnail URL is unavailable");
      if (thumbnailInput.current) {
        thumbnailInput.current.value = new URL(url, window.location.origin).href;
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Thumbnail could not be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }
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
    if (busy.current || uploading) return;
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
      <fieldset
        disabled={pending || uploading}
        className="grid gap-5 sm:grid-cols-2"
      >
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
                  {field.type === "project" ? (
                    <ProjectPicker initialCode={value} required={moderator} />
                  ) : field.options ? (
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
                      ref={
                        field.name === "thumbnail" ? thumbnailInput : undefined
                      }
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
                  {field.name === "thumbnail" ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="article-thumbnail-upload"
                        className="block text-sm font-semibold"
                      >
                        Or upload a thumbnail
                      </label>
                      <input
                        id="article-thumbnail-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className={contentControlClass}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadThumbnail(file);
                        }}
                      />
                    </div>
                  ) : null}
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
          disabled={pending || uploading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={contentButtonClass}
          disabled={pending || uploading}
        >
          {uploading ? "Uploading…" : pending ? "Saving…" : "Save"}
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
  const columns =
    kind === "articles"
      ? ["Title", "Category", "Source", "Project"]
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
            tabIndex={0}
            role="region"
            aria-label={`${config.title} table`}
            className="overflow-x-auto rounded-lg border border-slate-300 bg-background focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700"
          >
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-300 bg-muted dark:border-slate-700">
                <tr>
                  {[...columns, "Actions"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-200 last:border-0 dark:border-slate-800"
                  >
                    <td className="max-w-xs px-4 py-3">
                      <p className="break-words font-semibold">
                        {String(record.title || record.name)}
                      </p>
                      {kind === "articles" ? (
                        <a
                          href={String(record.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-primary underline dark:text-indigo-300"
                        >
                          Open article
                        </a>
                      ) : null}
                    </td>
                    {kind === "articles" ? (
                      <>
                        <td className="px-4 py-3 capitalize">
                          {String(record.category)}
                        </td>
                        <td className="max-w-48 break-words px-4 py-3">
                          {String(record.source)}
                        </td>
                        <td className="max-w-48 break-all px-4 py-3">
                          {String(record.projectId || "General article")}
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
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {permissions.update ? (
                          <Button
                            variant="outline"
                            className={contentButtonClass}
                            onClick={() => setEditor({ record })}
                            disabled={!ready}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {permissions.delete ? (
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              moderator={moderator}
              onClose={() => setEditor(null)}
              onSaved={() => {
                setEditor(null);
                void refresh();
              }}
            />
          ) : null}
        </DialogContent>
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

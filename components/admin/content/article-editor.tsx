"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import NextImage from "next/image";
import { toast } from "sonner";
import {
  Calendar,
  ChevronDown,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { saveContent } from "@/actions/mutation/content.mutation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ManagedRecord } from "@/lib/content-models";
import { getFullUrl } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import { contentButtonClass, contentControlClass } from "./content-controls";
import { CONTENT_CONFIG } from "./content-form-config";
import { ProjectPicker } from "./project-picker";

const controlClass = cn(contentControlClass, "rounded-lg");
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 60;
const THUMBNAIL_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const CATEGORIES =
  CONTENT_CONFIG.articles.fields.find((field) => field.name === "category")
    ?.options ?? [];

function FieldBlock({
  htmlFor,
  label,
  icon,
  required,
  description,
  className,
  children,
}: {
  htmlFor?: string;
  label: string;
  icon?: ReactNode;
  required?: boolean;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {icon}
          {label}
          {required ? " *" : ""}
        </label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function toDateInput(value: unknown) {
  return value ? new Date(String(value)).toISOString().slice(0, 10) : "";
}

export function ArticleEditor({
  record,
  moderator,
  onSaved,
  onClose,
}: {
  record: ManagedRecord | null;
  moderator: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState(String(record?.thumbnail ?? ""));
  const [thumbnailAlt, setThumbnailAlt] = useState(
    String(record?.thumbnailAlt ?? ""),
  );
  const [tags, setTags] = useState<string[]>(
    Array.isArray(record?.tags) ? (record.tags as string[]) : [],
  );
  const [tagInput, setTagInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
      setThumbnail(new URL(url, window.location.origin).href);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Thumbnail could not be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function addTags() {
    const next = [...tags];
    for (const raw of tagInput.split(",")) {
      const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
      if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
    }
    setTags(next);
    setTagInput("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uploading) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const publishedDate = text("publishedDate");
    const data: Record<string, unknown> = {
      title: text("title"),
      url: text("url"),
      source: text("source"),
      category: text("category"),
      projectId: text("projectId"),
      excerpt: text("excerpt"),
      thumbnail,
      thumbnailAlt: thumbnail ? thumbnailAlt : "",
      author: text("author"),
      publishedDate: publishedDate
        ? new Date(publishedDate).toISOString()
        : null,
      tags: tags.join(", "),
    };
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await saveContent("articles", data, record?.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(`${record ? "Updated" : "Created"} article`);
      onSaved();
    } catch {
      setError("Could not save. Your entries are still here; try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const disabled = pending || uploading;
  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <fieldset disabled={disabled} className="min-w-0 space-y-5 p-6">
          <FieldBlock htmlFor="article-title" label="Title" required>
            <input
              id="article-title"
              name="title"
              defaultValue={String(record?.title ?? "")}
              required
              maxLength={300}
              placeholder="Article title"
              className={controlClass}
            />
          </FieldBlock>

          <FieldBlock
            htmlFor="article-url"
            label="Article URL"
            icon={<LinkIcon className="size-4" aria-hidden="true" />}
            required
          >
            <input
              id="article-url"
              name="url"
              type="url"
              defaultValue={String(record?.url ?? "")}
              required
              maxLength={2048}
              placeholder="https://example.com/article"
              className={controlClass}
            />
          </FieldBlock>

          <div className="grid gap-5 sm:grid-cols-2">
            <FieldBlock htmlFor="article-source" label="Source" required>
              <input
                id="article-source"
                name="source"
                defaultValue={String(record?.source ?? "")}
                required
                maxLength={160}
                placeholder="e.g., DA Website"
                className={controlClass}
              />
            </FieldBlock>
            <FieldBlock htmlFor="article-category" label="Category" required>
              <div className="relative">
                <select
                  id="article-category"
                  name="category"
                  defaultValue={String(record?.category ?? "news")}
                  className={cn(controlClass, "appearance-none pr-9")}
                >
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </FieldBlock>
          </div>

          <FieldBlock
            label="Related Project (Optional)"
            description="Search by name or INFRA Watch project code. Leave blank for a general article."
          >
            <ProjectPicker
              initialCode={String(record?.projectId ?? "")}
              required={moderator}
            />
          </FieldBlock>

          <FieldBlock
            label="Thumbnail Image"
            icon={<ImageIcon className="size-4" aria-hidden="true" />}
            description="Upload an image from your computer"
          >
            <input
              ref={fileInput}
              id="article-thumbnail-upload"
              type="file"
              accept={THUMBNAIL_TYPES}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadThumbnail(file);
              }}
            />
            {thumbnail ? (
              <div className="space-y-3">
                <div className="h-48 w-full overflow-hidden rounded-lg border bg-muted">
                  <NextImage
                    src={thumbnail}
                    alt={thumbnailAlt || "Thumbnail preview"}
                    width={600}
                    height={192}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="article-thumbnail-alt"
                    className="block text-sm font-semibold"
                  >
                    Thumbnail description
                  </label>
                  <input
                    id="article-thumbnail-alt"
                    value={thumbnailAlt}
                    onChange={(event) => setThumbnailAlt(event.target.value)}
                    maxLength={300}
                    placeholder="Describe the image for screen readers"
                    className={controlClass}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className={cn(contentButtonClass, "w-full")}
                  onClick={() => {
                    setThumbnail("");
                    setThumbnailAlt("");
                  }}
                >
                  <X aria-hidden="true" />
                  Remove Image
                </Button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file?.type.startsWith("image/"))
                      void uploadThumbnail(file);
                  }}
                  className={cn(
                    "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    dragging || uploading
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/40 hover:border-primary hover:bg-muted/50",
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        className="size-8 animate-spin text-primary"
                        aria-hidden="true"
                      />
                      <span role="status" className="text-sm">
                        Uploading…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload
                        className="size-8 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-sm text-muted-foreground">
                        PNG, JPG, WebP or GIF
                      </span>
                    </>
                  )}
                </button>
                <div className="space-y-2">
                  <label
                    htmlFor="article-thumbnail-url"
                    className="block text-sm font-semibold"
                  >
                    Or use an image link
                  </label>
                  <input
                    id="article-thumbnail-url"
                    type="url"
                    maxLength={2048}
                    placeholder="https://example.com/image.jpg"
                    className={controlClass}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value) {
                        setThumbnail(value);
                        event.target.value = "";
                      }
                    }}
                  />
                </div>
              </>
            )}
          </FieldBlock>

          <FieldBlock
            htmlFor="article-excerpt"
            label="Excerpt"
            icon={<FileText className="size-4" aria-hidden="true" />}
          >
            <textarea
              id="article-excerpt"
              name="excerpt"
              defaultValue={String(record?.excerpt ?? "")}
              maxLength={3000}
              rows={3}
              placeholder="Short description of the article…"
              className={controlClass}
            />
          </FieldBlock>

          <div className="grid gap-5 sm:grid-cols-2">
            <FieldBlock htmlFor="article-author" label="Author">
              <input
                id="article-author"
                name="author"
                defaultValue={String(record?.author ?? "")}
                maxLength={160}
                placeholder="Author name"
                className={controlClass}
              />
            </FieldBlock>
            <FieldBlock
              htmlFor="article-published"
              label="Published Date"
              icon={<Calendar className="size-4" aria-hidden="true" />}
            >
              <input
                id="article-published"
                name="publishedDate"
                type="date"
                defaultValue={toDateInput(record?.publishedDate)}
                className={controlClass}
              />
            </FieldBlock>
          </div>

          <FieldBlock
            htmlFor="article-tags"
            label="Tags"
            icon={<Tag className="size-4" aria-hidden="true" />}
            description={`Up to ${MAX_TAGS} tags. Separate several tags with commas.`}
          >
            <div className="flex gap-2">
              <input
                id="article-tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTags();
                  }
                }}
                maxLength={MAX_TAG_LENGTH}
                placeholder="Add a tag…"
                className={cn(controlClass, "flex-1")}
              />
              <Button
                type="button"
                className={cn(contentButtonClass, "px-5")}
                onClick={addTags}
                disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
              >
                Add
              </Button>
            </div>
            {tags.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Added tags">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Badge
                      variant="secondary"
                      className="h-auto gap-1 overflow-visible py-1 pr-1 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remove tag ${tag}`}
                        className="inline-flex size-6 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </FieldBlock>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-600 p-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
        </fieldset>
      </div>

      <div className="flex shrink-0 gap-3 border-t p-6">
        <Button
          type="button"
          variant="outline"
          className={cn(contentButtonClass, "flex-1")}
          onClick={onClose}
          disabled={disabled}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={cn(contentButtonClass, "flex-1")}
          disabled={disabled}
        >
          {uploading
            ? "Uploading…"
            : pending
              ? "Saving…"
              : record
                ? "Update Article"
                : "Add Article"}
        </Button>
      </div>
    </form>
  );
}

import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Database,
  FileWarning,
  Filter,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldAlert,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { getAuditLogs } from "@/actions/query/audit-logs.query";
import type { AuditAction } from "@/types/audit.types";

type SearchParams = Record<string, string | string[] | undefined>;
type AuditLogRow = Awaited<ReturnType<typeof getAuditLogs>>["data"][number];
type QuickFilterParams = Partial<Record<"group" | "source" | "category", string>>;

const eventGroups = [
  { label: "All groups", value: "all" },
  { label: "Security", value: "security" },
  { label: "Upload Safety", value: "uploads" },
  { label: "Records", value: "records" },
  { label: "Sync", value: "sync" },
];

const sourceOptions = [
  { label: "All sources", value: "all" },
  { label: "Failed logins", value: "auth_attempts" },
  { label: "Blocked uploads", value: "upload_attempts" },
  { label: "Users", value: "user" },
  { label: "Feedback", value: "feedback" },
  { label: "Issues", value: "issues" },
  { label: "Issue responses", value: "issue_responses" },
  { label: "ABEMIS sync", value: "sync_logs" },
];

const categoryOptions = [
  { label: "All outcomes", value: "all" },
  { label: "Failed login", value: "login_failed" },
  { label: "Nude image blocked", value: "nsfw_content" },
  { label: "Invalid MIME type", value: "invalid_mime" },
  { label: "Signature mismatch", value: "invalid_signature" },
  { label: "Bad extension", value: "invalid_extension" },
  { label: "Too large", value: "size_limit" },
  { label: "Invalid request", value: "invalid_request" },
];

const actionLabels: Array<{ label: string; value: AuditAction | "all" }> = [
  { label: "All actions", value: "all" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
];

const quickFilters = [
  { label: "Failed logins", params: { group: "security", category: "login_failed" }, icon: ShieldAlert },
  { label: "Blocked uploads", params: { group: "uploads" }, icon: UploadCloud },
  { label: "Nude blocked", params: { group: "uploads", category: "nsfw_content" }, icon: AlertTriangle },
  { label: "Invalid files", params: { group: "uploads", category: "invalid_mime" }, icon: FileWarning },
  { label: "User changes", params: { source: "user" }, icon: UserRound },
  { label: "Feedback", params: { source: "feedback" }, icon: Database },
  { label: "Issues", params: { source: "issues" }, icon: Fingerprint },
  { label: "Sync runs", params: { group: "sync" }, icon: RefreshCw },
] satisfies Array<{ label: string; params: QuickFilterParams; icon: React.ComponentType<{ className?: string }> }>;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(Number(getParam(params, "page") ?? 1), 1);
  const filters = {
    search: getParam(params, "search") ?? "",
    group: getParam(params, "group") ?? "all",
    source: getParam(params, "source") ?? getParam(params, "tableName") ?? "all",
    category: getParam(params, "category") ?? "all",
    action: getParam(params, "action") ?? "all",
    fromDate: getParam(params, "fromDate") ?? "",
    toDate: getParam(params, "toDate") ?? "",
  };

  const logsResult = await getAuditLogs({
    page,
    group: cleanFilter(filters.group),
    source: cleanFilter(filters.source),
    action: cleanFilter(filters.action),
    category: cleanFilter(filters.category),
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
    search: filters.search.trim() || undefined,
  });

  const logs = logsResult.data;
  const pagination = logsResult.pagination;
  const sections = groupLogs(logs);
  const activeFilters = getActiveFilters(filters);

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "System" }, { label: "Audit Logs" }]}
      title="Audit Logs"
      description="Review security, upload safety, records, and sync activity in one chronological trail."
    >
      {logsResult.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {logsResult.error}
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((item) => {
            const Icon = item.icon;
            const active = isQuickFilterActive(item.params, filters);

            return (
              <Link
                key={item.label}
                href={`/audit-logs?${quickFilterQuery(item.params)}`}
                className={
                  active
                    ? "inline-flex h-8 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-extrabold text-white dark:bg-white dark:text-slate-950"
                    : "inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                }
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <details open={activeFilters.length > 0} className="group border-t border-slate-100 pt-3 dark:border-slate-800">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-bold text-primary [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            More filters
            {activeFilters.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                {activeFilters.length} active
              </span>
            )}
          </summary>

          <form className="mt-3 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_170px_180px_150px_150px_150px_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="search"
                  defaultValue={filters.search}
                  placeholder="Email, user, file, IP, note"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </label>

            <SelectFilter label="Group" name="group" value={filters.group} options={eventGroups} />
            <SelectFilter label="Source" name="source" value={filters.source} options={sourceOptions} />
            <SelectFilter label="Outcome" name="category" value={filters.category} options={categoryOptions} />
            <SelectFilter label="Action" name="action" value={filters.action} options={actionLabels} />

            <DateFilter label="From" name="fromDate" value={filters.fromDate} />
            <DateFilter label="To" name="toDate" value={filters.toDate} />

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90"
              >
                <Filter className="size-4" />
                Apply
              </button>
              {activeFilters.length > 0 && (
                <Link
                  href="/audit-logs"
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Clear filters"
                >
                  <X className="size-4" />
                </Link>
              )}
            </div>
          </form>
        </details>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Trail</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{pagination.total.toLocaleString()} recorded events</p>
          </div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
          </div>
        </div>

        {sections.length === 0 ? (
          <EmptyState activeFilters={activeFilters} />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="hidden gap-3 border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[76px_84px_minmax(0,1fr)_170px_20px] dark:border-slate-800 dark:text-slate-400">
                <span>Time</span>
                <span>Action</span>
                <span>Event</span>
                <span>Actor</span>
                <span className="sr-only">Details</span>
              </div>

              {sections.map((section) => (
                <div key={section.key}>
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    {section.day}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {section.logs.map((log) => (
                      <AuditTrailRow key={log.id} log={log} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)}
            </p>
            <div className="flex gap-2">
              <PageLink params={params} page={pagination.page - 1} disabled={pagination.page <= 1}>Previous</PageLink>
              <PageLink params={params} page={pagination.page + 1} disabled={pagination.page >= pagination.totalPages}>Next</PageLink>
            </div>
          </div>
        )}
      </section>
    </AdminPageWrapper>
  );
}

function AuditTrailRow({ log }: { log: AuditLogRow }) {
  return (
    <details className="group">
      <summary
        className="flex cursor-pointer list-none flex-col gap-1 px-4 py-2.5 text-sm hover:bg-slate-50 sm:grid sm:grid-cols-[76px_84px_minmax(0,1fr)_170px_20px] sm:items-center sm:gap-3 dark:hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden"
      >
        <time className="font-mono text-xs text-slate-500 dark:text-slate-400" dateTime={new Date(log.createdAt).toISOString()}>
          {formatTime(log.createdAt)}
        </time>
        <span className={getActionTextClass(log.action)}>{log.action}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className={getGroupDotClass(log.eventGroup)} aria-hidden="true" />
          <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{log.displayTitle}</span>
        </span>
        <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{log.userName || "System"}</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-90 sm:block" />
      </summary>

      <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Record {shorten(log.recordId)}</span>
          <span>Source {sourceLabel(log.tableName)}</span>
          {log.eventCategory && <span>Outcome {categoryLabel(log.eventCategory)}</span>}
          {log.ipAddress && <span>IP {log.ipAddress}</span>}
          {log.fileName && <span>File {log.fileName}</span>}
          {log.mimeType && <span>MIME {log.mimeType}</span>}
        </div>
        {log.notes && <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{log.notes}</p>}
        {Array.isArray(log.changedFields) && log.changedFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {log.changedFields.map((field) => (
              <span key={field} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {field}
              </span>
            ))}
          </div>
        )}
        <LogValues title="Before" value={log.oldValues} tone="red" />
        <LogValues title="After" value={log.newValues} tone="green" />
        {log.userAgent && <p className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{log.userAgent}</p>}
      </div>
    </details>
  );
}

function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <select
        name={name}
        defaultValue={value || "all"}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function EmptyState({ activeFilters }: { activeFilters: string[] }) {
  return (
    <div className="grid place-items-center p-10 text-center">
      <div className="max-w-md space-y-3">
        <div className="mx-auto inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <Search className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">No matching audit logs</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activeFilters.length > 0 ? "Clear one or more filters to widen the result set." : "New audit events will appear here after tracked workflows run."}
          </p>
        </div>
        {activeFilters.length > 0 && (
          <Link href="/audit-logs" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-bold text-white hover:bg-primary/90">
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}

function LogValues({ title, value, tone }: { title: string; value: unknown; tone: "red" | "green" }) {
  if (!value) return null;

  const toneClass = tone === "red"
    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <div>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <pre className={`max-h-64 overflow-auto rounded-lg border p-3 text-xs ${toneClass}`}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function PageLink({
  children,
  disabled,
  page,
  params,
}: {
  children: React.ReactNode;
  disabled: boolean;
  page: number;
  params: SearchParams;
}) {
  const className = "inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800";

  if (disabled) {
    return <span className={`${className} pointer-events-none opacity-50`}>{children}</span>;
  }

  return <Link href={`/audit-logs?${buildQuery(params, page)}`} className={className}>{children}</Link>;
}

function groupLogs(logs: AuditLogRow[]) {
  const buckets = new Map<string, { key: string; day: string; logs: AuditLogRow[] }>();

  for (const log of logs) {
    const day = formatDay(log.createdAt);
    const bucket = buckets.get(day) ?? { key: day, day, logs: [] };
    bucket.logs.push(log);
    buckets.set(day, bucket);
  }

  return Array.from(buckets.values());
}

function getActiveFilters(filters: {
  search: string;
  group: string;
  source: string;
  category: string;
  action: string;
  fromDate: string;
  toDate: string;
}) {
  const active: string[] = [];
  if (filters.search) active.push(`Search: ${filters.search}`);
  if (filters.group !== "all") active.push(`Group: ${optionLabel(eventGroups, filters.group)}`);
  if (filters.source !== "all") active.push(`Source: ${optionLabel(sourceOptions, filters.source)}`);
  if (filters.category !== "all") active.push(`Outcome: ${optionLabel(categoryOptions, filters.category)}`);
  if (filters.action !== "all") active.push(`Action: ${filters.action}`);
  if (filters.fromDate) active.push(`From: ${filters.fromDate}`);
  if (filters.toDate) active.push(`To: ${filters.toDate}`);
  return active;
}

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function cleanFilter(value: string) {
  return value && value !== "all" ? value : undefined;
}

function buildQuery(params: SearchParams, page: number) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const resolved = Array.isArray(value) ? value[0] : value;
    if (resolved && resolved !== "all" && key !== "page" && key !== "tableName") {
      query.set(key, resolved);
    }
  }

  query.set("page", String(page));
  return query.toString();
}

function isQuickFilterActive(quickParams: QuickFilterParams, filters: { group: string; source: string; category: string }) {
  return Object.entries(quickParams).every(([key, value]) => filters[key as keyof typeof filters] === value);
}

function quickFilterQuery(params: QuickFilterParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

function optionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function formatDay(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shorten(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function sourceLabel(source: string) {
  return sourceOptions.find((item) => item.value === source)?.label ?? source;
}

function categoryLabel(category: string) {
  return categoryOptions.find((item) => item.value === category)?.label ?? category;
}

function getActionTextClass(action: string) {
  const base = "text-xs font-extrabold";

  if (action === "CREATE") return `${base} text-emerald-600 dark:text-emerald-400`;
  if (action === "DELETE") return `${base} text-red-600 dark:text-red-400`;
  return `${base} text-blue-600 dark:text-blue-400`;
}

function getGroupDotClass(group: string) {
  const base = "inline-block size-2 shrink-0 rounded-full";
  if (group === "Security") return `${base} bg-red-500`;
  if (group === "Upload Safety") return `${base} bg-amber-500`;
  if (group === "Sync") return `${base} bg-blue-500`;
  return `${base} bg-emerald-500`;
}

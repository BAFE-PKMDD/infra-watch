"use client";

import { FormEvent, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { DataQualityOverview } from "@/components/admin/data-quality/data-quality-overview";
import { Pagination } from "@/components/admin/projects/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDataQualityReport } from "@/hooks/use-data-quality";
import type { DataQualityIssueType } from "@/types/data-quality.types";

const ISSUE_OPTIONS: Array<{ value: DataQualityIssueType; label: string }> = [
  { value: "missing_approved_budget", label: "Missing approved budget" },
  { value: "missing_actual_bid_amount", label: "Missing supplier bid amount" },
  { value: "bid_exceeds_approved_budget", label: "Bid exceeds approved budget" },
  { value: "missing_location", label: "Missing location" },
  { value: "invalid_coordinates", label: "Invalid coordinates" },
  { value: "duplicate_project_code", label: "Duplicate project code" },
  { value: "stale_source_record", label: "Cleanup candidates" },
];

export default function DataQualityPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DataQualityIssueType | undefined>();
  const [page, setPage] = useState(1);
  const reportQuery = useDataQualityReport({ type, search, page, pageSize: 25 });

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "System" }, { label: "Data Quality" }]}
      title="Data Quality"
      description="Identify project records that may need correction or cleaning and review non-mutating recommendations."
    >
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Data quality filters">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end" onSubmit={applySearch}>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="quality-search">Project search</Label>
            <Input
              id="quality-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Project name, code, or ABEMIS ID"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quality-type">Issue type</Label>
            <select
              id="quality-type"
              value={type ?? ""}
              onChange={(event) => {
                setType(event.target.value ? event.target.value as DataQualityIssueType : undefined);
                setPage(1);
              }}
              className="h-8 min-w-64 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">All detected issues</option>
              {ISSUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <Button type="submit"><Search className="size-4" />Scan</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setType(undefined);
              setPage(1);
            }}
          >
            Reset
          </Button>
        </form>
      </section>

      {reportQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" role="alert">
          {reportQuery.error.message}
        </div>
      )}

      {reportQuery.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">Analyzing project data…</div>
      ) : reportQuery.data ? (
        <>
          <DataQualityOverview report={reportQuery.data} />
          <Pagination
            page={reportQuery.data.pagination.page}
            totalPages={reportQuery.data.pagination.totalPages}
            totalCount={reportQuery.data.pagination.totalCount}
            itemLabel="projects with findings"
            onPageChange={setPage}
          />
        </>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <p>Data Quality is recommendation-only. It cannot correct, clean, archive, delete, or otherwise change project records.</p>
      </div>
    </AdminPageWrapper>
  );
}

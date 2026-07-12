"use client";

import { useState } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Pagination } from "@/components/admin/projects/pagination";
import { ProjectStatsCard } from "@/components/admin/projects/project-stats-card";
import { ProjectsFilters } from "@/components/admin/projects/projects-filters";
import { ProjectsTable } from "@/components/admin/projects/projects-table";
import { useAdminProjects, useAdminProjectStats } from "@/hooks/use-projects";

export default function AdminProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [program, setProgram] = useState("all");
  const [page, setPage] = useState(1);

  const filters = { search, status, program, page, pageSize: 25 };
  const { data, isLoading, error } = useAdminProjects(filters);
  const { data: statsData } = useAdminProjectStats();

  const projects = data?.projects ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setProgram("all");
    setPage(1);
  };

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Projects" }]}
      title="Synced Project Catalog"
      description="Read-only AMEFIP and INS project records mirrored from ABEMIS for search, reporting, and public feedback."
    >
      {statsData?.statistics && <ProjectStatsCard statistics={statsData.statistics} />}

      <ProjectsFilters
        search={search}
        status={status}
        program={program}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onProgramChange={(value) => {
          setProgram(value);
          setPage(1);
        }}
        onReset={resetFilters}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error instanceof Error ? error.message : "Failed to load projects"}
        </div>
      )}

      <ProjectsTable projects={projects} isLoading={isLoading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} totalCount={pagination.totalCount} onPageChange={setPage} />
    </AdminPageWrapper>
  );
}
